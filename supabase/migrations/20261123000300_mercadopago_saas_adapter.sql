begin;

create table turnly_private.saas_mandate (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.negocio(id),
  plan text not null references turnly_private.commercial_price(plan),
  amount numeric(12,2) not null check (amount>0),
  currency text not null,
  anchor timestamptz not null,
  provider_ref text unique,
  state text not null default 'creating' check (state in ('creating','pending','authorized','canceled')),
  cancel_requested boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index saas_one_open_mandate on turnly_private.saas_mandate(business_id) where state<>'canceled';

create table turnly_private.saas_delivery (
  topic text not null check (topic in ('subscription_preapproval','subscription_authorized_payment','payment')),
  provider_id text not null check (provider_id ~ '^[a-zA-Z0-9_-]{1,96}$'),
  revision bigint not null default 1,
  attempts integer not null default 0,
  retry_at timestamptz not null default now(),
  outcome text not null default 'pending' check (outcome in ('pending','done','review')),
  primary key(topic,provider_id)
);
create index saas_deliveries_due on turnly_private.saas_delivery(retry_at) where outcome='pending';
revoke all on turnly_private.saas_mandate,turnly_private.saas_delivery from public,anon,authenticated;

create function public.turnly_saas_owner(actor uuid, requested text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b uuid; sub turnly_private.commercial_subscription%rowtype;
        mandate turnly_private.saas_mandate%rowtype; price turnly_private.commercial_price%rowtype;
begin
  select id into b from public.negocio where owner_id=actor order by created_at,id limit 1;
  if b is null then return jsonb_build_object('error','forbidden'); end if;
  perform pg_advisory_xact_lock(hashtextextended(b::text,0));
  select * into strict sub from turnly_private.commercial_subscription where business_id=b for update;
  select * into mandate from turnly_private.saas_mandate where business_id=b and state<>'canceled';
  if requested is null then return to_jsonb(mandate); end if;
  if mandate.id is not null then
    if mandate.plan<>requested or mandate.cancel_requested then return jsonb_build_object('error','open_mandate'); end if;
    return to_jsonb(mandate)||jsonb_build_object('create',false);
  end if;
  if sub.auto_renew or sub.period_end>statement_timestamp() then return jsonb_build_object('error','paid_period'); end if;
  select * into price from turnly_private.commercial_price where plan=requested;
  if not found then return jsonb_build_object('error','price'); end if;
  insert into turnly_private.saas_mandate(business_id,plan,amount,currency,anchor)
  values(b,price.plan,price.amount,price.currency,
    (date_trunc('day',statement_timestamp() at time zone 'UTC')+interval '1 day') at time zone 'UTC')
  returning * into mandate;
  update turnly_private.commercial_subscription set requested_plan=requested where business_id=b;
  insert into turnly_private.commercial_audit(business_id,actor,event,detail)
  values(b,actor,'mandate_creation_reserved',jsonb_build_object('reference',mandate.id,'plan',requested,
    'amount',price.amount,'currency',price.currency,'disclosure','monthly_v1'));
  return to_jsonb(mandate)||jsonb_build_object('create',true);
end $$;

create function public.turnly_saas_mandate(reference uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select to_jsonb(m) from turnly_private.saas_mandate m where m.id=reference
$$;

create function public.turnly_saas_bind(reference uuid, provider text, provider_state text) returns boolean
language plpgsql security definer set search_path='' as $$
declare m turnly_private.saas_mandate%rowtype;
begin
  if provider is null or provider !~ '^[a-zA-Z0-9_-]{1,96}$'
    or provider_state is null or provider_state not in ('pending','authorized','canceled') then return false; end if;
  select * into m from turnly_private.saas_mandate where id=reference;
  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(m.business_id::text,0));
  select * into strict m from turnly_private.saas_mandate where id=reference for update;
  if m.provider_ref is not null and m.provider_ref<>provider then return false; end if;
  if m.state='canceled' then return provider_state='canceled'; end if;
  if m.state='authorized' and provider_state='pending' then return true; end if;
  if m.provider_ref=provider and m.state=provider_state then return true; end if;
  update turnly_private.saas_mandate set provider_ref=provider,state=provider_state,
    cancel_requested=case when provider_state='canceled' then false else cancel_requested end where id=reference;
  if provider_state='canceled' then
    perform public.turnly_commercial_confirm_cancellation(m.business_id,provider);
    update turnly_private.commercial_subscription set cancel_pending=false
    where business_id=m.business_id and provider_ref=provider;
  else
    update turnly_private.commercial_subscription set provider_ref=provider,auto_renew=(provider_state='authorized'),
      cancel_pending=m.cancel_requested,
      state=case when state='canceled' and period_start is null and trial_end>statement_timestamp() then 'trialing'
                 when state='canceled' then 'past_due' else state end
    where business_id=m.business_id;
  end if;
  insert into turnly_private.commercial_audit(business_id,event,detail)
  values(m.business_id,'mandate_'||provider_state,jsonb_build_object('reference',reference));
  return true;
end $$;

create function public.turnly_saas_mark_cancel(reference uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare target uuid; provider text;
begin
  select business_id,provider_ref into target,provider from turnly_private.saas_mandate where id=reference;
  if target is null then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,0));
  update turnly_private.saas_mandate set cancel_requested=true where id=reference and state<>'canceled' and not cancel_requested;
  if found then
    update turnly_private.commercial_subscription set cancel_pending=true where business_id=target;
    if provider is not null then perform public.turnly_saas_enqueue('subscription_preapproval',provider); end if;
    insert into turnly_private.commercial_audit(business_id,event,detail)
    values(target,'mandate_cancellation_requested',jsonb_build_object('reference',reference));
  end if;
  return true;
end $$;

alter table turnly_private.commercial_payment drop constraint commercial_payment_status_check;
alter table turnly_private.commercial_payment add constraint commercial_payment_status_check
  check (status in ('pending','rejected','approved','refunded','partially_refunded','charged_back'));
create unique index saas_settled_once on turnly_private.commercial_payment(invoice_id)
  where status in ('approved','refunded','partially_refunded','charged_back');

create function public.turnly_saas_apply_invoice(reference uuid, invoice_key text, provider text,
  debit_day timestamptz, payment_key text, payment_state text, amount_paid numeric, currency_paid text)
returns text language plpgsql security definer set search_path='' as $$
declare m turnly_private.saas_mandate%rowtype; sub turnly_private.commercial_subscription%rowtype;
        inv turnly_private.commercial_invoice%rowtype; first_cycle boolean; start_at timestamptz;
        end_at timestamptz; settled text;
begin
  select * into m from turnly_private.saas_mandate where id=reference;
  if not found or m.provider_ref is distinct from provider or m.amount is distinct from amount_paid
    or m.currency is distinct from currency_paid or debit_day is null then return 'review'; end if;
  perform pg_advisory_xact_lock(hashtextextended(m.business_id::text,0));
  select * into strict m from turnly_private.saas_mandate where id=reference for update;
  select * into strict sub from turnly_private.commercial_subscription where business_id=m.business_id for update;
  select * into inv from turnly_private.commercial_invoice where provider_invoice=invoice_key;
  if found then
    if inv.business_id<>m.business_id or inv.provider_ref<>provider then return 'review'; end if;
    if inv.starts_at<>debit_day then return 'review'; end if;
    select status into settled from turnly_private.commercial_payment where invoice_id=inv.id and payment_id=payment_key;
    if settled in ('refunded','partially_refunded','charged_back') then return 'done'; end if;
  else
    if m.state='pending' or m.cancel_requested then return 'pending'; end if;
    if m.state<>'authorized' or sub.provider_ref is distinct from provider then return 'review'; end if;
    select not exists(select 1 from turnly_private.commercial_invoice where provider_ref=provider) into first_cycle;
    start_at:=case when first_cycle then m.anchor else sub.period_end end;
    if debit_day>start_at or start_at is null then return 'pending'; end if;
    if debit_day<>start_at or (sub.period_end is not null and debit_day<sub.period_end) then return 'review'; end if;
    end_at:=(((start_at at time zone 'UTC')+interval '1 month') at time zone 'UTC');
    insert into turnly_private.commercial_invoice(business_id,provider_invoice,provider_ref,plan,amount,currency,starts_at,ends_at)
    values(m.business_id,invoice_key,provider,m.plan,m.amount,m.currency,start_at,end_at) returning * into inv;
    insert into turnly_private.commercial_audit(business_id,event,detail)
    values(m.business_id,'invoice_staged',jsonb_build_object('invoice',inv.id,'plan',m.plan));
  end if;
  if payment_key is null then return 'pending'; end if;
  if payment_state in ('refunded','partially_refunded','charged_back') then
    if settled is distinct from 'approved' then return 'review'; end if;
    update turnly_private.commercial_payment set status=payment_state,updated_at=statement_timestamp() where payment_id=payment_key;
    update turnly_private.commercial_subscription set state='expired'
    where business_id=m.business_id and period_start=inv.starts_at and period_end=inv.ends_at;
    insert into turnly_private.commercial_audit(business_id,event,detail)
    values(m.business_id,'payment_'||payment_state,jsonb_build_object('invoice',inv.id,'payment',payment_key));
    return 'done';
  end if;
  if m.state='canceled' and settled is distinct from 'approved' then return 'review'; end if;
  if payment_state='approved' and inv.starts_at>statement_timestamp() then return 'pending'; end if;
  if public.turnly_commercial_record_payment(invoice_key,provider,payment_key,payment_state,amount_paid,currency_paid)
  then return case when payment_state='pending' then 'pending' else 'done' end; end if;
  return 'review';
end $$;

create function public.turnly_saas_invoice_for_payment(payment_key text) returns text
language sql stable security definer set search_path='' as $$
  select i.provider_invoice from turnly_private.commercial_invoice i
  join turnly_private.commercial_payment p on p.invoice_id=i.id where p.payment_id=payment_key
$$;

create function public.turnly_saas_enqueue(event_topic text, resource text) returns bigint
language sql security definer set search_path='' as $$
  insert into turnly_private.saas_delivery(topic,provider_id) values(event_topic,resource)
  on conflict(topic,provider_id) do update set revision=saas_delivery.revision+1,outcome='pending',retry_at=now()
  returning revision
$$;
create function public.turnly_saas_pending() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
    select topic,provider_id,revision from turnly_private.saas_delivery
    where outcome='pending' and retry_at<=now() order by retry_at,topic,provider_id limit 10
  ) q
$$;
create function public.turnly_saas_finish(event_topic text, resource text, generation bigint, result text) returns void
language sql security definer set search_path='' as $$
  update turnly_private.saas_delivery
  set outcome=case when result='pending' and attempts>=47 then 'review' else result end,
      attempts=attempts+1,retry_at=now()+interval '30 minutes'
  where topic=event_topic and provider_id=resource and revision=generation and outcome='pending'
$$;

revoke all on function public.turnly_saas_owner(uuid,text),public.turnly_saas_mandate(uuid),
  public.turnly_saas_bind(uuid,text,text),public.turnly_saas_mark_cancel(uuid),
  public.turnly_saas_apply_invoice(uuid,text,text,timestamptz,text,text,numeric,text),
  public.turnly_saas_invoice_for_payment(text),public.turnly_saas_enqueue(text,text),
  public.turnly_saas_pending(),public.turnly_saas_finish(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.turnly_saas_owner(uuid,text),public.turnly_saas_mandate(uuid),
  public.turnly_saas_bind(uuid,text,text),public.turnly_saas_mark_cancel(uuid),
  public.turnly_saas_apply_invoice(uuid,text,text,timestamptz,text,text,numeric,text),
  public.turnly_saas_invoice_for_payment(text),public.turnly_saas_enqueue(text,text),
  public.turnly_saas_pending(),public.turnly_saas_finish(text,text,bigint,text) to service_role;

commit;
