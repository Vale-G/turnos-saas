-- Turnly security boundary and transactional booking intervals.
--
-- IMPORTANT: this migration is intentionally not executed against production by CI.
-- Validate it first against the schema-only fixture and an isolated Supabase project.

create schema if not exists turnly_private;
revoke all on schema turnly_private from public, anon, authenticated;
grant usage on schema turnly_private to authenticated, service_role;

create extension if not exists pgcrypto with schema extensions;

alter table public.adminrol
  add column if not exists negocio_id uuid references public.negocio(id) on delete cascade;

alter table public.turno
  add column if not exists cliente_email text,
  add column if not exists cliente_telefono text,
  add column if not exists duracion_minutos integer,
  add column if not exists hora_fin time without time zone,
  add column if not exists manage_token_hash bytea;

alter table public.negocio
  add column if not exists zona_horaria text not null default 'America/Argentina/Buenos_Aires';

alter table public.turno drop constraint if exists turno_duracion_minutos_chk;
alter table public.turno add constraint turno_duracion_minutos_chk
  check (duracion_minutos is null or duracion_minutos between 1 and 1440) not valid;

alter table public.turno drop constraint if exists turno_contacto_email_chk;
alter table public.turno add constraint turno_contacto_email_chk
  check (cliente_email is null or (length(cliente_email) between 3 and 254 and cliente_email like '%@%')) not valid;

alter table public.negocio drop constraint if exists negocio_zona_horaria_chk;
alter table public.negocio add constraint negocio_zona_horaria_chk
  check (zona_horaria in ('America/Argentina/Buenos_Aires')) not valid;

create index if not exists turno_staff_fecha_activo_idx
  on public.turno (staff_id, fecha, hora)
  where estado <> 'cancelado';
create index if not exists bloqueo_staff_fecha_idx
  on public.bloqueo (staff_id, fecha, hora_inicio, hora_fin);
create index if not exists bloquehorario_negocio_fecha_idx
  on public.bloquehorario (negocio_id, fecha, dia_semana, recurrente);
create index if not exists adminrol_negocio_user_idx
  on public.adminrol (negocio_id, user_id);

create or replace function turnly_private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.adminrol
    where user_id = (select auth.uid()) and role = 'superadmin'
  );
$$;

create or replace function turnly_private.can_access_business(target_negocio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.negocio n
    where n.id = target_negocio_id and n.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.adminrol ar
    where ar.user_id = (select auth.uid())
      and (ar.role = 'superadmin' or ar.negocio_id = target_negocio_id)
  );
$$;

revoke all on function turnly_private.is_superadmin() from public, anon;
revoke all on function turnly_private.can_access_business(uuid) from public, anon;
grant execute on function turnly_private.is_superadmin() to authenticated, service_role;
grant execute on function turnly_private.can_access_business(uuid) to authenticated, service_role;

create or replace function turnly_private.enforce_turno_interval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  svc public.servicio%rowtype;
  worker public.staff%rowtype;
  business public.negocio%rowtype;
  starts_at timestamp without time zone;
  ends_at timestamp without time zone;
  weekday smallint;
begin
  if new.estado = 'cancelado' then
    return new;
  end if;

  if new.staff_id is null or new.servicio_id is null then
    raise exception using errcode = '23514', message = 'La reserva requiere servicio y profesional';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.staff_id::text || ':' || new.fecha::text, 0));

  select * into svc from public.servicio where id = new.servicio_id;
  select * into worker from public.staff where id = new.staff_id;
  select * into business from public.negocio where id = new.negocio_id;

  if svc.id is null or worker.id is null or business.id is null
     or svc.negocio_id <> new.negocio_id
     or worker.negocio_id <> new.negocio_id
     or not worker.activo or not business.activo then
    raise exception using errcode = '23514', message = 'Servicio, profesional o negocio inválido';
  end if;
  if svc.duracion is null or svc.duracion < 1 or svc.duracion > 1440 then
    raise exception using errcode = '23514', message = 'Duración de servicio inválida';
  end if;

  new.duracion_minutos := svc.duracion;
  starts_at := new.fecha::timestamp + new.hora;
  ends_at := starts_at + make_interval(mins => new.duracion_minutos);
  if tg_op = 'INSERT' and starts_at < (now() at time zone business.zona_horaria) + interval '15 minutes' then
    raise exception using errcode = '23514', message = 'La reserva requiere al menos 15 minutos de anticipación';
  end if;
  if ends_at::date <> new.fecha then
    raise exception using errcode = '23514', message = 'La reserva no puede cruzar de día';
  end if;
  new.hora_fin := ends_at::time;
  weekday := extract(dow from new.fecha)::smallint;

  if business.hora_apertura is null or business.hora_cierre is null
     or new.hora < business.hora_apertura or new.hora_fin > business.hora_cierre
     or not (weekday = any(coalesce(business.dias_laborales, array[]::smallint[]))) then
    raise exception using errcode = '23514', message = 'Horario fuera de la disponibilidad del negocio';
  end if;

  if exists (
    select 1 from public.bloqueo b
    where b.staff_id = new.staff_id and b.fecha = new.fecha
      and new.hora < b.hora_fin and new.hora_fin > b.hora_inicio
  ) or exists (
    select 1 from public.bloquehorario bh
    where bh.negocio_id = new.negocio_id
      and (bh.fecha = new.fecha or (bh.recurrente and bh.dia_semana = weekday))
      and new.hora < bh.hora_fin and new.hora_fin > bh.hora_inicio
  ) then
    raise exception using errcode = '23P01', message = 'El horario está bloqueado';
  end if;

  if exists (
    select 1 from public.turno t
    where t.staff_id = new.staff_id and t.fecha = new.fecha
      and t.estado <> 'cancelado' and t.id <> new.id
      and new.hora < coalesce(t.hora_fin, (t.hora + make_interval(mins => coalesce(t.duracion_minutos, 1440)))::time)
      and new.hora_fin > t.hora
  ) then
    raise exception using errcode = '23P01', message = 'El horario ya no está disponible';
  end if;

  return new;
end;
$$;

revoke all on function turnly_private.enforce_turno_interval() from public, anon, authenticated;

drop trigger if exists turno_interval_guard on public.turno;
create trigger turno_interval_guard
before insert or update of negocio_id, staff_id, servicio_id, fecha, hora, estado
on public.turno
for each row execute function turnly_private.enforce_turno_interval();

create or replace function public.turnly_create_public_booking(
  p_negocio_id uuid,
  p_servicio_id uuid,
  p_staff_id uuid,
  p_fecha date,
  p_hora time without time zone,
  p_cliente_id uuid,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_cliente_email text
)
returns table(turno_id uuid, manage_token text)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  raw_token text;
  inserted_id uuid;
begin
  if p_cliente_nombre is null or length(btrim(p_cliente_nombre)) not between 2 and 120
     or p_cliente_telefono is null or length(regexp_replace(p_cliente_telefono, '[^0-9]', '', 'g')) not between 6 and 20
     or p_cliente_email is null or length(p_cliente_email) not between 3 and 254 or p_cliente_email not like '%@%'
     or p_fecha is null or p_hora is null then
    raise exception using errcode = '22023', message = 'Datos de reserva inválidos';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');
  insert into public.turno (
    negocio_id, servicio_id, staff_id, cliente_id, cliente_nombre,
    cliente_telefono, cliente_email, fecha, hora, estado, manage_token_hash
  ) values (
    p_negocio_id, p_servicio_id, p_staff_id, p_cliente_id, btrim(p_cliente_nombre),
    regexp_replace(p_cliente_telefono, '[^0-9+]', '', 'g'), lower(btrim(p_cliente_email)),
    p_fecha, p_hora, 'pendiente', digest(raw_token, 'sha256')
  ) returning id into inserted_id;

  return query select inserted_id, raw_token;
end;
$$;

revoke all on function public.turnly_create_public_booking(uuid, uuid, uuid, date, time without time zone, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.turnly_create_public_booking(uuid, uuid, uuid, date, time without time zone, uuid, text, text, text)
  to service_role;

create or replace function public.turnly_verify_manage_token(p_turno_id uuid, p_token text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select exists (
    select 1 from public.turno
    where id = p_turno_id
      and manage_token_hash is not null
      and p_token ~ '^[0-9a-f]{64}$'
      and manage_token_hash = digest(p_token, 'sha256')
  );
$$;

revoke all on function public.turnly_verify_manage_token(uuid, text) from public, anon, authenticated;
grant execute on function public.turnly_verify_manage_token(uuid, text) to service_role;

create or replace function public.turnly_cancel_public_booking(p_turno_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  update public.turno
  set estado = 'cancelado', updated_at = now()
  where id = p_turno_id
    and estado not in ('cancelado', 'completado')
    and manage_token_hash is not null
    and p_token ~ '^[0-9a-f]{64}$'
    and manage_token_hash = digest(p_token, 'sha256');
  return found;
end;
$$;

revoke all on function public.turnly_cancel_public_booking(uuid, text) from public, anon, authenticated;
grant execute on function public.turnly_cancel_public_booking(uuid, text) to service_role;

create or replace function public.turnly_apply_booking_payment(
  p_event_key text, p_payment_id text, p_turno_id uuid, p_kind text,
  p_status text, p_amount numeric, p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expected numeric;
  expected_currency text;
  inserted_event uuid;
begin
  if p_kind not in ('full', 'sena') or p_status not in ('approved','pending','in_process','rejected','cancelled') then return false; end if;
  select case when p_kind = 'sena' then t.monto_sena else s.precio end, n.moneda
    into expected, expected_currency
  from public.turno t join public.servicio s on s.id = t.servicio_id join public.negocio n on n.id = t.negocio_id
  where t.id = p_turno_id;
  if expected is null or p_amount <> expected or p_currency <> expected_currency then return false; end if;

  insert into public.webhook_event(provider,event_key,payload,processed_at)
  values ('mercadopago', p_event_key, jsonb_build_object('payment_id',p_payment_id,'status',p_status,'kind',p_kind), now())
  on conflict(provider,event_key) do nothing returning id into inserted_event;
  if inserted_event is null then return true; end if;

  update public.turno set
    pago_id = p_payment_id,
    pago_estado = p_status,
    sena_pagada = case when p_kind = 'sena' and p_status = 'approved' then true else sena_pagada end,
    estado = case when p_status = 'approved' then 'confirmado' when p_status in ('rejected','cancelled') and p_kind = 'full' then 'cancelado' else estado end,
    updated_at = now()
  where id = p_turno_id;
  return found;
end;
$$;

create or replace function public.turnly_apply_subscription_payment(
  p_event_key text, p_payment_id text, p_negocio_id uuid, p_plan text,
  p_status text, p_amount numeric, p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  subscription_id uuid;
  expected numeric;
  expected_currency text;
  inserted_event uuid;
begin
  if p_plan not in ('basico','pro') or p_status not in ('approved','pending','in_process','rejected','cancelled') then return false; end if;
  select s.id,s.monto,n.moneda into subscription_id,expected,expected_currency
  from public.suscripcion s join public.negocio n on n.id=s.negocio_id
  where s.negocio_id=p_negocio_id and s.plan=p_plan and s.estado='pendiente'
  order by s.created_at desc limit 1 for update of s;
  if subscription_id is null or p_amount <> expected or p_currency <> expected_currency then return false; end if;

  insert into public.webhook_event(provider,event_key,payload,processed_at)
  values ('mercadopago-subscription',p_event_key,jsonb_build_object('payment_id',p_payment_id,'status',p_status,'plan',p_plan),now())
  on conflict(provider,event_key) do nothing returning id into inserted_event;
  if inserted_event is null then return true; end if;

  update public.suscripcion set estado=case when p_status='approved' then 'activa' when p_status in ('rejected','cancelled') then 'fallida' else 'pendiente' end,
    mp_payment_id=p_payment_id, fecha_pago=case when p_status='approved' then now() else fecha_pago end,
    fecha_vencimiento=case when p_status='approved' then now()+interval '31 days' else fecha_vencimiento end, updated_at=now()
  where id=subscription_id;
  if p_status='approved' then update public.negocio set suscripcion_tipo=p_plan,updated_at=now() where id=p_negocio_id; end if;
  return true;
end;
$$;

revoke all on function public.turnly_apply_booking_payment(text,text,uuid,text,text,numeric,text) from public,anon,authenticated;
revoke all on function public.turnly_apply_subscription_payment(text,text,uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.turnly_apply_booking_payment(text,text,uuid,text,text,numeric,text) to service_role;
grant execute on function public.turnly_apply_subscription_payment(text,text,uuid,text,text,numeric,text) to service_role;

-- Remove every legacy policy before replacing it with the tenant boundary below.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public' and tablename in (
             'negocio','servicio','staff','turno','bloqueo','bloquehorario',
             'clientenota','gasto','suscripcion','adminrol','config','webhook_event'
           )
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.negocio enable row level security;
alter table public.servicio enable row level security;
alter table public.staff enable row level security;
alter table public.turno enable row level security;
alter table public.bloqueo enable row level security;
alter table public.bloquehorario enable row level security;
alter table public.clientenota enable row level security;
alter table public.gasto enable row level security;
alter table public.suscripcion enable row level security;
alter table public.adminrol enable row level security;
alter table public.config enable row level security;
alter table public.webhook_event enable row level security;

create policy negocio_tenant_select on public.negocio for select to authenticated
  using (turnly_private.can_access_business(id));
create policy negocio_tenant_update on public.negocio for update to authenticated
  using (turnly_private.can_access_business(id)) with check (turnly_private.can_access_business(id));

create policy servicio_tenant_all on public.servicio for all to authenticated
  using (turnly_private.can_access_business(negocio_id)) with check (turnly_private.can_access_business(negocio_id));
create policy staff_tenant_all on public.staff for all to authenticated
  using (turnly_private.can_access_business(negocio_id)) with check (turnly_private.can_access_business(negocio_id));
create policy turno_tenant_select on public.turno for select to authenticated
  using (turnly_private.can_access_business(negocio_id) or cliente_id = (select auth.uid()));
create policy turno_tenant_insert on public.turno for insert to authenticated
  with check (turnly_private.can_access_business(negocio_id));
create policy turno_tenant_update on public.turno for update to authenticated
  using (turnly_private.can_access_business(negocio_id)) with check (turnly_private.can_access_business(negocio_id));
create policy turno_tenant_delete on public.turno for delete to authenticated
  using (turnly_private.can_access_business(negocio_id));
create policy bloqueo_tenant_all on public.bloqueo for all to authenticated
  using (negocio_id is not null and turnly_private.can_access_business(negocio_id))
  with check (negocio_id is not null and turnly_private.can_access_business(negocio_id));
create policy bloquehorario_tenant_all on public.bloquehorario for all to authenticated
  using (turnly_private.can_access_business(negocio_id)) with check (turnly_private.can_access_business(negocio_id));
create policy clientenota_tenant_all on public.clientenota for all to authenticated
  using (turnly_private.can_access_business(negocio_id)) with check (turnly_private.can_access_business(negocio_id));
create policy gasto_tenant_all on public.gasto for all to authenticated
  using (negocio_id is not null and turnly_private.can_access_business(negocio_id))
  with check (negocio_id is not null and turnly_private.can_access_business(negocio_id));
create policy suscripcion_tenant_select on public.suscripcion for select to authenticated
  using (turnly_private.can_access_business(negocio_id));
create policy adminrol_self_select on public.adminrol for select to authenticated
  using (user_id = (select auth.uid()) or turnly_private.is_superadmin());
create policy config_superadmin_all on public.config for all to authenticated
  using (turnly_private.is_superadmin()) with check (turnly_private.is_superadmin());
create policy webhook_superadmin_select on public.webhook_event for select to authenticated
  using (turnly_private.is_superadmin());

-- Tables are never exposed to anonymous clients. Public booking goes through the
-- validated Next.js API and the service-role-only function above.
revoke all on public.negocio, public.servicio, public.staff, public.turno,
  public.bloqueo, public.bloquehorario, public.clientenota, public.gasto,
  public.suscripcion, public.adminrol, public.config, public.webhook_event from anon;

grant select, insert, update, delete on public.servicio, public.staff, public.turno,
  public.bloqueo, public.bloquehorario, public.clientenota, public.gasto to authenticated;
grant select on public.suscripcion, public.adminrol, public.config, public.webhook_event to authenticated;
grant insert, update, delete on public.config to authenticated;

revoke all on public.negocio from authenticated;
grant select (id, owner_id, nombre, slug, descripcion, logo_url, whatsapp, tema,
  hora_apertura, hora_cierre, dias_laborales, activo, onboarding_completo,
  suscripcion_tipo, trial_hasta, created_at, updated_at, email_contacto, moneda, zona_horaria)
  on public.negocio to authenticated;
grant update (nombre, slug, descripcion, logo_url, whatsapp, tema, hora_apertura,
  hora_cierre, dias_laborales, activo, onboarding_completo, email_contacto, moneda, zona_horaria)
  on public.negocio to authenticated;

grant select, insert, update, delete on public.negocio, public.servicio, public.staff,
  public.turno, public.bloqueo, public.bloquehorario, public.clientenota,
  public.gasto, public.suscripcion, public.adminrol, public.config,
  public.webhook_event to service_role;
