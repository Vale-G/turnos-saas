-- Idempotent email delivery claims. Reuse the private webhook event ledger so
-- recipients and manage tokens are never persisted in notification metadata.
create or replace function public.turnly_claim_notification(p_turno_id uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare claimed_id uuid;
begin
  if p_kind not in ('customer-confirmation', 'business-new-booking') and p_kind !~ '^reminder:[0-9]{4}-[0-9]{2}-[0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}$' then return false; end if;
  if not exists (select 1 from public.turno where id = p_turno_id) then return false; end if;
  insert into public.webhook_event(provider,event_key,payload,received_at,processed_at)
  values ('resend','turno:'||p_turno_id::text||':'||p_kind,
    jsonb_build_object('status','processing','attempts',1,'kind',p_kind),now(),null)
  on conflict(provider,event_key) do update
    set payload=jsonb_build_object('status','processing','attempts',coalesce((public.webhook_event.payload->>'attempts')::integer,0)+1,'kind',p_kind),
        received_at=now(), processed_at=null
    where public.webhook_event.payload->>'status'='failed'
       or (public.webhook_event.payload->>'status'='processing' and public.webhook_event.received_at < now()-interval '15 minutes')
  returning id into claimed_id;
  return claimed_id is not null;
end; $$;

create or replace function public.turnly_complete_notification(p_turno_id uuid,p_kind text,p_status text,p_provider_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if (p_kind not in ('customer-confirmation','business-new-booking') and p_kind !~ '^reminder:[0-9]{4}-[0-9]{2}-[0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}$') or p_status not in ('sent','failed') then return false; end if;
  update public.webhook_event set
    payload=payload||jsonb_build_object('status',p_status,'provider_id',left(coalesce(p_provider_id,''),200),'error',left(coalesce(p_error,''),500)),
    processed_at=case when p_status='sent' then now() else null end
  where provider='resend' and event_key='turno:'||p_turno_id::text||':'||p_kind and payload->>'status'='processing';
  return found;
end; $$;

revoke all on function public.turnly_claim_notification(uuid,text) from public,anon,authenticated;
revoke all on function public.turnly_complete_notification(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.turnly_claim_notification(uuid,text) to service_role;
grant execute on function public.turnly_complete_notification(uuid,text,text,text,text) to service_role;
