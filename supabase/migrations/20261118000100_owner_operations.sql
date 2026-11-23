-- Old appointments retain NULL measurements: their historical terms are unknown.
alter table public.negocio
  add column politica_sena text not null default 'opcional' check (politica_sena in ('ninguna','opcional','obligatoria')),
  add column horas_cancelacion integer not null default 0 check (horas_cancelacion between 0 and 720),
  add column horas_reprogramacion integer not null default 0 check (horas_reprogramacion between 0 and 720);
grant select(politica_sena,horas_cancelacion,horas_reprogramacion), update(politica_sena,horas_cancelacion,horas_reprogramacion) on public.negocio to authenticated;
alter table public.servicio add column politica_sena text check (politica_sena in ('ninguna','opcional','obligatoria'));
alter table public.turno add column precio_acordado numeric(12,2),
 add column politica_sena text, add column sena_acordada numeric(12,2),
 add column asignado_en timestamptz,
 add column cancelado_en timestamptz, add column cancelado_por text,
 add column inicio_real timestamptz, add column fin_real timestamptz,
 add column saldo_mp numeric(12,2);
grant update(inicio_real) on public.turno to authenticated;

create function turnly_private.booking_terms() returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if tg_op='INSERT' or new.servicio_id is distinct from old.servicio_id then
    select s.precio, coalesce(s.politica_sena,n.politica_sena),
      case s.seña_tipo when 'fijo' then least(s.precio,s.seña_valor)
        when 'porcentaje' then round(s.precio * least(100,s.seña_valor)/100,2) else 0 end
      into strict new.precio_acordado,new.politica_sena,new.sena_acordada
      from public.servicio s join public.negocio n on n.id=s.negocio_id
      where s.id=new.servicio_id and n.id=new.negocio_id;
    if new.politica_sena='ninguna' then new.sena_acordada:=0; end if;
    if new.politica_sena='obligatoria' and coalesce(new.sena_acordada,0)<=0 then
      raise exception 'Falta configurar el monto de la seña';
    end if;
  end if;
  if new.politica_sena='obligatoria' and not new.sena_pagada and coalesce(new.saldo_mp,0)<new.precio_acordado and new.estado in ('confirmado','completado') then
    raise exception 'La seña todavía no está cobrada';
  end if;
  if tg_op='INSERT' or (new.fecha,new.hora,new.staff_id) is distinct from (old.fecha,old.hora,old.staff_id) then
    new.asignado_en:=statement_timestamp();
  end if;
  if tg_op='UPDATE' then
    if new.estado='no_asistio' and old.estado<>'no_asistio' and exists (
      select 1 from public.negocio n where n.id=new.negocio_id
      and (new.fecha+new.hora) at time zone n.zona_horaria > now()) then
      raise exception 'Todavía no comenzó el turno';
    end if;
    if new.inicio_real is distinct from old.inicio_real then
      if old.inicio_real is not null or old.estado not in ('pendiente','confirmado') then raise exception 'Inicio inválido'; end if;
      new.inicio_real:=statement_timestamp();
    end if;
    if new.estado='completado' and old.estado<>'completado' and new.inicio_real is not null then new.fin_real:=coalesce(old.fin_real,statement_timestamp()); end if;
    if new.estado='cancelado' and old.estado<>'cancelado' then
      new.cancelado_en:=statement_timestamp();
      new.cancelado_por:=coalesce(new.cancelado_por,'negocio');
    elsif new.estado<>'cancelado' then new.cancelado_en:=null; new.cancelado_por:=null; end if;
  end if;
  return new;
end;
$$;
create trigger turno_booking_terms before insert or update on public.turno for each row execute function turnly_private.booking_terms();

create or replace function public.turnly_cancel_public_booking(p_turno_id uuid, p_token text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  update public.turno
  set cancelado_por = 'cliente', estado = 'cancelado', updated_at = now()
  where id = p_turno_id
    and estado in ('pendiente','confirmado')
    and exists (select 1 from public.negocio n where n.id=turno.negocio_id
      and (n.horas_cancelacion=0 or (turno.fecha + turno.hora) at time zone n.zona_horaria >= now()+make_interval(hours=>n.horas_cancelacion)))
    and manage_token_hash is not null
    and p_token ~ '^[0-9a-f]{64}$'
    and manage_token_hash = digest(p_token, 'sha256');
  return found;
end;
$$;


create or replace function public.turnly_reschedule_public_booking(
  p_turno_id uuid,
  p_token text,
  p_fecha date,
  p_hora time without time zone,
  p_staff_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  update public.turno
  set fecha = p_fecha,
      hora = p_hora,
      staff_id = p_staff_id,
      updated_at = now()
  where id = p_turno_id
    and estado in ('pendiente','confirmado')
    and exists (select 1 from public.negocio n where n.id=turno.negocio_id
      and (n.horas_reprogramacion=0 or (turno.fecha + turno.hora) at time zone n.zona_horaria >= now()+make_interval(hours=>n.horas_reprogramacion)))
    and manage_token_hash is not null
    and p_token ~ '^[0-9a-f]{64}$'
    and manage_token_hash = digest(p_token, 'sha256');
  return found;
end;
$$;

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
  select case when p_kind = 'sena' then t.monto_sena else coalesce(t.precio_acordado,s.precio) - case when t.sena_pagada then coalesce(t.monto_sena,0) else 0 end end, n.moneda
    into expected, expected_currency
  from public.turno t join public.servicio s on s.id = t.servicio_id join public.negocio n on n.id = t.negocio_id
  where t.id = p_turno_id for update of t;
  if expected is null or p_amount <> expected or p_currency <> expected_currency then return false; end if;

  insert into public.webhook_event(provider,event_key,payload,processed_at)
  values ('mercadopago', p_event_key, jsonb_build_object('payment_id',p_payment_id,'status',p_status,'kind',p_kind), now())
  on conflict(provider,event_key) do nothing returning id into inserted_event;
  if inserted_event is null then return true; end if;

  update public.turno set
    saldo_mp = case when p_kind='full' and p_status='approved' then p_amount else saldo_mp end,
    pago_id = p_payment_id,
    pago_estado = p_status,
    sena_pagada = case when p_kind = 'sena' and p_status = 'approved' then true else sena_pagada end,
    estado = case when estado in ('cancelado','completado','no_asistio') then estado when p_status = 'approved' then 'confirmado' when p_status in ('rejected','cancelled') and p_kind = 'full' then 'cancelado' else estado end,
    updated_at = now()
  where id = p_turno_id;
  return found;
end;
$$;


create function public.turnly_book_with_policy(
  p_negocio_id uuid,p_servicio_id uuid,p_staff_id uuid,p_fecha date,p_hora time,
  p_cliente_id uuid,p_cliente_nombre text,p_cliente_telefono text,p_cliente_email text,p_pagar_sena boolean
) returns table(turno_id uuid,manage_token text,obligatoria boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare booking record;
begin
  select * into strict booking from public.turnly_create_public_booking(p_negocio_id,p_servicio_id,p_staff_id,p_fecha,p_hora,p_cliente_id,p_cliente_nombre,p_cliente_telefono,p_cliente_email);
  select t.politica_sena='obligatoria' into obligatoria from public.turno t where t.id=booking.turno_id;
  if obligatoria and p_pagar_sena is not true then raise exception 'La reserva requiere seña'; end if;
  turno_id:=booking.turno_id; manage_token:=booking.manage_token; return next;
end;
$$;
revoke all on function public.turnly_book_with_policy(uuid,uuid,uuid,date,time,uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.turnly_book_with_policy(uuid,uuid,uuid,date,time,uuid,text,text,text,boolean) to service_role;
-- Payment processor fields are written only by server callbacks.
revoke insert(sena_pagada,monto_sena,mp_preference_id,pago_id),update(sena_pagada,monto_sena,mp_preference_id,pago_id) on public.turno from authenticated;
