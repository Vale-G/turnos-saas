begin;

-- A single catalogue drives enforcement and the subscription screen.
create table turnly_private.commercial_plan (
  id text primary key,
  staff_limit integer not null,
  service_limit integer not null,
  advanced boolean not null
);
insert into turnly_private.commercial_plan values
  ('trial',5,10,true), ('basico',2,5,false), ('pro',15,50,true);

create table turnly_private.commercial_trial_claim (
  owner_id uuid primary key,
  claimed_at timestamptz not null default now()
);

create table turnly_private.commercial_subscription (
  business_id uuid primary key references public.negocio(id) on delete cascade,
  plan text check (plan in ('basico','pro')),
  state text not null check (state in ('trialing','active','past_due','canceled','expired')),
  trial_end timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  auto_renew boolean not null default false,
  cancel_pending boolean not null default false,
  requested_plan text check (requested_plan in ('basico','pro')),
  provider_ref text unique,
  check ((period_start is null and period_end is null)
    or (plan is not null and period_start is not null and period_end > period_start))
);

create table turnly_private.commercial_invoice (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references turnly_private.commercial_subscription(business_id),
  provider_invoice text not null unique,
  provider_ref text not null,
  plan text not null check (plan in ('basico','pro')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (ends_at > starts_at),
  unique (business_id, starts_at)
);

create table turnly_private.commercial_payment (
  payment_id text primary key,
  invoice_id uuid not null references turnly_private.commercial_invoice(id),
  status text not null check (status in ('pending','rejected','approved')),
  updated_at timestamptz not null default now()
);
create unique index commercial_single_approval on turnly_private.commercial_payment(invoice_id) where status='approved';

create table turnly_private.commercial_audit (
  id bigint generated always as identity primary key,
  business_id uuid not null,
  actor uuid,
  event text not null,
  detail jsonb not null,
  at timestamptz not null default now()
);
create index commercial_audit_history on turnly_private.commercial_audit(business_id,id desc);

revoke all on turnly_private.commercial_plan, turnly_private.commercial_trial_claim,
  turnly_private.commercial_subscription, turnly_private.commercial_invoice,
  turnly_private.commercial_payment, turnly_private.commercial_audit from public,anon,authenticated;

-- Preserve historical payments. Carry forward only dated, identifiable paid periods.
insert into turnly_private.commercial_trial_claim(owner_id,claimed_at)
select owner_id,min(created_at) from public.negocio group by owner_id;
insert into turnly_private.commercial_subscription (business_id, plan, state, trial_end, period_start, period_end)
select n.id, paid.plan,
       case when paid.fecha_vencimiento>now() and paid.fecha_pago<=now() then 'active'
            when n.suscripcion_tipo='trial' and n.trial_hasta>now() then 'trialing' else 'expired' end,
       case when n.suscripcion_tipo='trial' then n.trial_hasta end, paid.fecha_pago, paid.fecha_vencimiento
from public.negocio n
left join lateral (
  select s.plan,s.fecha_pago,s.fecha_vencimiento from public.suscripcion s
  where s.negocio_id=n.id and s.estado='activa' and nullif(s.mp_payment_id,'') is not null
    and s.plan in ('basico','pro') and s.monto>0 and s.fecha_pago<=now() and s.fecha_vencimiento>s.fecha_pago
  order by s.fecha_vencimiento desc,s.id limit 1
) paid on true;
update public.negocio n set suscripcion_tipo=s.plan
from turnly_private.commercial_subscription s
where s.business_id=n.id and s.state='active' and n.suscripcion_tipo is distinct from s.plan;

create function turnly_private.start_commercial_trial() returns trigger
language plpgsql security definer set search_path='' as $$
declare first_trial boolean; deadline timestamptz;
begin
  insert into turnly_private.commercial_trial_claim(owner_id) values(new.owner_id) on conflict do nothing;
  first_trial := found;
  deadline := case when first_trial then statement_timestamp()+interval '336 hours' end;
  insert into turnly_private.commercial_subscription(business_id,state,trial_end)
  values(new.id,case when first_trial then 'trialing' else 'expired' end,deadline);
  update public.negocio set trial_hasta=deadline where id=new.id;
  return new;
end $$;
create trigger commercial_trial after insert on public.negocio for each row
execute function turnly_private.start_commercial_trial();

create function turnly_private.commercial_effective(business uuid)
returns table(state text, effective_plan text, staff_limit int, service_limit int, advanced boolean)
language sql stable security definer set search_path='' as $$
  select case when s.state='canceled' then 'canceled'
              when access.plan='trial' then 'trialing'
              when access.plan is not null then s.state
              when s.state in ('past_due','canceled') then s.state else 'expired' end,
         access.plan,coalesce(p.staff_limit,0),coalesce(p.service_limit,0),coalesce(p.advanced,false)
  from turnly_private.commercial_subscription s
  cross join lateral (select case
    when s.state in ('active','past_due','canceled') and s.period_start<=statement_timestamp() and s.period_end>statement_timestamp() then s.plan
    when (s.state='trialing' or (s.state='canceled' and s.period_start is null)) and s.trial_end>statement_timestamp() then 'trial' end as plan) access
  left join turnly_private.commercial_plan p on p.id=access.plan
  where s.business_id=business
$$;

create function public.turnly_commercial_advanced(business uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select advanced from turnly_private.commercial_effective(business)),false)
$$;
revoke all on function public.turnly_commercial_advanced(uuid) from public,anon,authenticated;
grant execute on function public.turnly_commercial_advanced(uuid) to service_role;

create function turnly_private.assert_commercial_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid; entitlement record; usage_count integer;
begin
  if tg_op='DELETE' then target:=old.negocio_id; else target:=new.negocio_id; end if;
  if tg_op='UPDATE' and tg_table_name in ('staff','servicio') and new.negocio_id=old.negocio_id then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,0));
  select * into entitlement from turnly_private.commercial_effective(target);
  if entitlement.effective_plan is null then
    raise exception using errcode='23514', message='Suscripción vencida: conservá la agenda y regularizá tu plan';
  end if;
  if tg_table_name='turno' then
    if not entitlement.advanced and new.politica_sena='obligatoria' then
      raise exception using errcode='23514', message='La seña obligatoria requiere un plan con cobros';
    end if;
  elsif tg_table_name='staff' then
    select count(*) into usage_count from public.staff where negocio_id=target;
    if usage_count>=entitlement.staff_limit then raise exception using errcode='23514', message='Límite de profesionales alcanzado'; end if;
  elsif tg_table_name='servicio' then
    select count(*) into usage_count from public.servicio where negocio_id=target;
    if usage_count>=entitlement.service_limit then raise exception using errcode='23514', message='Límite de servicios alcanzado'; end if;
  elsif tg_table_name in ('gasto','clientenota') and not entitlement.advanced then
    raise exception using errcode='42501', message='Esta operación requiere Pro o una prueba vigente';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger staff_plan_limit on public.staff;
drop trigger servicio_plan_limit on public.servicio;
create trigger staff_commercial_limit before insert or update of negocio_id on public.staff for each row execute function turnly_private.assert_commercial_write();
create trigger servicio_commercial_limit before insert or update of negocio_id on public.servicio for each row execute function turnly_private.assert_commercial_write();
-- Runs after turno_booking_terms, which snapshots the deposit policy.
create trigger z_booking_commercial before insert or update of negocio_id on public.turno for each row
  when (new.negocio_id is not null) execute function turnly_private.assert_commercial_write();
create trigger commercial_expenses before insert or update or delete on public.gasto for each row execute function turnly_private.assert_commercial_write();
create trigger commercial_client_notes before insert or update or delete on public.clientenota for each row execute function turnly_private.assert_commercial_write();

-- Check real entitlement ahead of the inherited reports implementation.
alter function public.turnly_owner_insights(uuid,date,uuid,uuid) set schema turnly_private;
alter function turnly_private.turnly_owner_insights(uuid,date,uuid,uuid) rename to commercial_insights_core;
revoke all on function turnly_private.commercial_insights_core(uuid,date,uuid,uuid) from public,anon,authenticated,service_role;
create function public.turnly_owner_insights(business uuid, month_start date, worker uuid default null, service uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not turnly_private.can_manage_business(business) or not public.turnly_commercial_advanced(business) then
    raise exception using errcode='42501', message='Acceso denegado';
  end if;
  return turnly_private.commercial_insights_core(business,month_start,worker,service);
end $$;
revoke all on function public.turnly_owner_insights(uuid,date,uuid,uuid) from public,anon;
grant execute on function public.turnly_owner_insights(uuid,date,uuid,uuid) to authenticated;

-- Client roles cannot write commercial state, invoice, payment or audit rows.
revoke all on function public.turnly_apply_subscription_payment(text,text,uuid,text,text,numeric,text)
  from public,anon,authenticated,service_role;
revoke all on function turnly_private.start_commercial_trial() from public,anon,authenticated;
revoke all on function turnly_private.commercial_effective(uuid) from public,anon,authenticated;
revoke all on function turnly_private.assert_commercial_write() from public,anon,authenticated;

create table turnly_private.commercial_price (
  plan text primary key check (plan in ('basico','pro')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$')
);
revoke all on turnly_private.commercial_price from public,anon,authenticated;

create function public.turnly_commercial_stage_invoice(
  business uuid, provider_subscription text, invoice_key text, starts timestamptz, ends timestamptz
) returns uuid language plpgsql security definer set search_path='' as $$
declare sub turnly_private.commercial_subscription%rowtype; quote turnly_private.commercial_price%rowtype;
        prior turnly_private.commercial_invoice%rowtype; result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(business::text,0));
  select * into sub from turnly_private.commercial_subscription where business_id=business for update;
  if not found or nullif(provider_subscription,'') is null or nullif(invoice_key,'') is null
    or starts is null or ends is null or ends<>(((starts at time zone 'UTC')+interval '1 month') at time zone 'UTC') then
    raise exception 'Período de facturación inválido';
  end if;
  select * into prior from turnly_private.commercial_invoice where provider_invoice=invoice_key;
  if found then
    if prior.business_id=business and prior.provider_ref=provider_subscription and prior.starts_at=starts and prior.ends_at=ends then return prior.id; end if;
    raise exception 'Factura no corresponde al período';
  end if;
  if sub.cancel_pending or
    (sub.state='canceled' and (sub.requested_plan is null or sub.provider_ref=provider_subscription))
    or (sub.state<>'canceled' and sub.provider_ref is not null and sub.provider_ref<>provider_subscription)
    or (sub.period_end is not null and starts<sub.period_end) then
    raise exception 'La suscripción no admite esa renovación';
  end if;
  select * into quote from turnly_private.commercial_price where plan=coalesce(sub.requested_plan,sub.plan);
  if not found then raise exception 'Precio comercial sin aprobar'; end if;
  insert into turnly_private.commercial_invoice(business_id,provider_invoice,provider_ref,plan,amount,currency,starts_at,ends_at)
  values(business,invoice_key,provider_subscription,quote.plan,quote.amount,quote.currency,starts,ends) returning id into result;
  update turnly_private.commercial_subscription set provider_ref=provider_subscription,auto_renew=true,
    state=case when state='canceled' then 'past_due' else state end where business_id=business;
  insert into turnly_private.commercial_audit(business_id,event,detail)
  values(business,'invoice_staged',jsonb_build_object('invoice',result,'plan',quote.plan));
  return result;
end $$;

create function public.turnly_commercial_record_payment(
  invoice_key text, provider_subscription text, payment_key text, payment_status text, amount numeric, currency text
) returns boolean language plpgsql security definer set search_path='' as $$
declare invoice turnly_private.commercial_invoice%rowtype; sub turnly_private.commercial_subscription%rowtype;
        prior turnly_private.commercial_payment%rowtype;
begin
  select * into invoice from turnly_private.commercial_invoice where provider_invoice=invoice_key;
  if not found or invoice.provider_ref is distinct from provider_subscription
    or invoice.amount is distinct from amount or invoice.currency is distinct from currency
    or nullif(payment_key,'') is null or payment_status is null or payment_status not in ('pending','rejected','approved') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(invoice.business_id::text,0));
  select * into sub from turnly_private.commercial_subscription where business_id=invoice.business_id for update;
  select * into prior from turnly_private.commercial_payment where payment_id=payment_key for update;
  if found then
    if prior.invoice_id<>invoice.id then return false; end if;
    if prior.status=payment_status or prior.status='approved' or (prior.status='rejected' and payment_status='pending') then return true; end if;
  end if;
  if sub.provider_ref is distinct from invoice.provider_ref then return false; end if;
  if exists (select 1 from turnly_private.commercial_payment where invoice_id=invoice.id and status='approved') then return false; end if;
  if payment_status='approved' and (invoice.starts_at>statement_timestamp() or invoice.ends_at<=statement_timestamp()
    or (sub.period_end is not null and invoice.starts_at<sub.period_end)) then return false; end if;

  insert into turnly_private.commercial_payment(payment_id,invoice_id,status)
  values(payment_key,invoice.id,payment_status)
  on conflict(payment_id) do update set status=excluded.status,updated_at=statement_timestamp()
  where commercial_payment.invoice_id=excluded.invoice_id;
  if not found then return false; end if;

  if payment_status='approved' then
    update turnly_private.commercial_subscription
    set plan=invoice.plan,period_start=invoice.starts_at,period_end=invoice.ends_at,
        state=case when state='canceled' then 'canceled' else 'active' end,
        requested_plan=case when requested_plan=invoice.plan then null else requested_plan end
    where business_id=invoice.business_id;
    update public.negocio set suscripcion_tipo=invoice.plan where id=invoice.business_id;
  elsif payment_status='rejected' then
    update turnly_private.commercial_subscription set state='past_due'
    where business_id=invoice.business_id and state not in ('trialing','canceled');
  end if;
  insert into turnly_private.commercial_audit(business_id,event,detail)
  values(invoice.business_id,'payment_'||payment_status,jsonb_build_object('invoice',invoice.id,'payment',payment_key));
  return true;
end $$;

create function public.turnly_commercial_summary(business uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare target uuid; user_id uuid:=auth.uid(); result jsonb;
begin
  if user_id is null then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if business is not null then
    if not turnly_private.can_manage_business(business) then raise exception 'Acceso denegado' using errcode='42501'; end if;
    target:=business;
  else
    select id into target from public.negocio where owner_id=user_id order by created_at,id limit 1;
  end if;
  select jsonb_build_object(
    'businessId',target,'plan',s.plan,'effectivePlan',e.effective_plan,'state',e.state,
    'trialEnd',s.trial_end,'periodStart',s.period_start,'periodEnd',s.period_end,'autoRenew',s.auto_renew,
    'cancelPending',s.cancel_pending,'requestedPlan',s.requested_plan,
    'limits',jsonb_build_object('staff',e.staff_limit,'services',e.service_limit,'advanced',e.advanced),
    'usage',jsonb_build_object('staff',(select count(*) from public.staff where negocio_id=target),
      'services',(select count(*) from public.servicio where negocio_id=target)),
    'catalog',(select jsonb_agg(to_jsonb(c) order by c.id) from turnly_private.commercial_plan c),
    'payments',coalesce((select jsonb_agg(to_jsonb(h) order by h.at desc) from (
      select p.status, i.plan, i.amount, i.currency, p.updated_at as at
      from turnly_private.commercial_payment p join turnly_private.commercial_invoice i on i.id=p.invoice_id where i.business_id=target
      union all select estado,plan,monto,null::text,coalesce(fecha_pago,created_at) from public.suscripcion where negocio_id=target
      order by at desc limit 50) h),'[]'::jsonb)
  ) into result from turnly_private.commercial_subscription s
  cross join lateral turnly_private.commercial_effective(s.business_id) e where s.business_id=target;
  return result;
end $$;

create function public.turnly_commercial_request(action text, desired_plan text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare target uuid; user_id uuid:=auth.uid(); sub turnly_private.commercial_subscription%rowtype;
begin
  select id into target from public.negocio where owner_id=user_id order by created_at,id limit 1;
  if target is null then raise exception 'Acceso denegado' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,0));
  select * into strict sub from turnly_private.commercial_subscription where business_id=target for update;
  if action='change_plan' and desired_plan in ('basico','pro') then
    if sub.requested_plan=desired_plan then return true; end if;
    update turnly_private.commercial_subscription set requested_plan=desired_plan where business_id=target;
  elsif action='cancel_renewal' then
    if sub.cancel_pending or not sub.auto_renew then return true; end if;
    update turnly_private.commercial_subscription set cancel_pending=true where business_id=target;
  else raise exception 'Operación inválida' using errcode='22023'; end if;
  insert into turnly_private.commercial_audit(business_id,actor,event,detail)
  values(target,user_id,action,jsonb_build_object('requested_plan',desired_plan));
  return true;
end $$;

create function public.turnly_commercial_confirm_cancellation(business uuid, provider_subscription text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(business::text,0));
  update turnly_private.commercial_subscription set auto_renew=false,cancel_pending=false,state='canceled'
  where business_id=business and provider_ref=provider_subscription and auto_renew;
  if found then
    insert into turnly_private.commercial_audit(business_id,event,detail) values(business,'renewal_stopped','{}');
    return true;
  end if;
  return exists(select 1 from turnly_private.commercial_subscription where business_id=business and provider_ref=provider_subscription and state='canceled');
end $$;

create function public.turnly_commercial_support(business uuid, incident text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare summary jsonb;
begin
  if not turnly_private.is_superadmin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
  summary:=public.turnly_commercial_summary(business);
  if summary is null then return null; end if;
  if incident is not null then
    if length(trim(incident)) not between 4 and 500 then raise exception 'Nota inválida' using errcode='22023'; end if;
    insert into turnly_private.commercial_audit(business_id,actor,event,detail)
    values(business,auth.uid(),'support_note',jsonb_build_object('note',trim(incident)));
  end if;
  return summary||jsonb_build_object('audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (
    select id,actor,event,detail,at from turnly_private.commercial_audit where business_id=business order by id desc limit 50
  ) a),'[]'::jsonb));
end $$;

revoke all on function public.turnly_commercial_stage_invoice(uuid,text,text,timestamptz,timestamptz),
  public.turnly_commercial_record_payment(text,text,text,text,numeric,text),
  public.turnly_commercial_confirm_cancellation(uuid,text) from public,anon,authenticated;
grant execute on function public.turnly_commercial_stage_invoice(uuid,text,text,timestamptz,timestamptz),
  public.turnly_commercial_record_payment(text,text,text,text,numeric,text),
  public.turnly_commercial_confirm_cancellation(uuid,text) to service_role;
revoke all on function public.turnly_commercial_summary(uuid),public.turnly_commercial_request(text,text),
  public.turnly_commercial_support(uuid,text) from public,anon;
grant execute on function public.turnly_commercial_summary(uuid),public.turnly_commercial_request(text,text),
  public.turnly_commercial_support(uuid,text) to authenticated;

commit;
