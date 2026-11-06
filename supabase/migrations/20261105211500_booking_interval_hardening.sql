-- Harden the interval guard after QA reproduced two bypasses:
-- 1. legacy rows without a duration wrapped a 24-hour fallback back to the same time;
-- 2. authenticated users could update the derived interval columns directly.

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
  -- Cancelling an existing booking must remain possible even if its staff or
  -- business was disabled later. Keep the trusted snapshot already stored.
  if tg_op = 'UPDATE' and new.estado = 'cancelado' then
    new.duracion_minutos := old.duracion_minutos;
    new.hora_fin := old.hora_fin;
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

  -- These values are snapshots derived by the database, never trusted input.
  -- Preserve a historical snapshot on state/payment-only updates even if the
  -- service duration changed later. Recalculate only for inserts/reschedules.
  if tg_op = 'INSERT'
     or new.servicio_id is distinct from old.servicio_id
     or new.fecha is distinct from old.fecha
     or new.hora is distinct from old.hora
     or (tg_op = 'UPDATE' and old.estado = 'cancelado' and new.estado <> 'cancelado')
     or old.duracion_minutos is null
     or old.hora_fin is null then
    new.duracion_minutos := svc.duracion;
  else
    new.duracion_minutos := old.duracion_minutos;
  end if;
  starts_at := new.fecha::timestamp + new.hora;
  ends_at := starts_at + make_interval(mins => new.duracion_minutos);
  if tg_op = 'INSERT' and starts_at < (now() at time zone business.zona_horaria) + interval '15 minutes' then
    raise exception using errcode = '23514', message = 'La reserva requiere al menos 15 minutos de anticipación';
  end if;
  if ends_at::date <> new.fecha then
    raise exception using errcode = '23514', message = 'La reserva no puede cruzar de día';
  end if;
  new.hora_fin := ends_at::time;

  -- A cancelled row does not consume availability, but INSERT still derives
  -- its interval instead of trusting caller-provided snapshot fields.
  if new.estado = 'cancelado' then
    return new;
  end if;

  weekday := extract(dow from new.fecha)::smallint;

  if business.hora_apertura is null or business.hora_cierre is null
     or new.hora < business.hora_apertura or new.hora_fin > business.hora_cierre
     or not (weekday = any(coalesce(business.dias_laborales, array[]::smallint[]))) then
    raise exception using errcode = '23514', message = 'Horario fuera de la disponibilidad del negocio';
  end if;

  if exists (
    select 1 from public.bloqueo b
    where b.staff_id = new.staff_id and b.fecha = new.fecha
      and starts_at < (b.fecha::timestamp + b.hora_fin)
      and ends_at > (b.fecha::timestamp + b.hora_inicio)
  ) or exists (
    select 1 from public.bloquehorario bh
    where bh.negocio_id = new.negocio_id
      and (bh.fecha = new.fecha or (bh.recurrente and bh.dia_semana = weekday))
      and new.hora < bh.hora_fin and new.hora_fin > bh.hora_inicio
  ) then
    raise exception using errcode = '23P01', message = 'El horario está bloqueado';
  end if;

  if exists (
    select 1
    from public.turno t
    left join public.servicio existing_svc on existing_svc.id = t.servicio_id
    where t.staff_id = new.staff_id and t.fecha = new.fecha
      and t.estado <> 'cancelado' and t.id <> new.id
      and starts_at < (
        t.fecha::timestamp + t.hora
        + make_interval(mins => coalesce(t.duracion_minutos, existing_svc.duracion, 1440))
      )
      and ends_at > (t.fecha::timestamp + t.hora)
  ) then
    raise exception using errcode = '23P01', message = 'El horario ya no está disponible';
  end if;

  return new;
end;
$$;

drop trigger if exists turno_interval_guard on public.turno;
create trigger turno_interval_guard
before insert or update of negocio_id, staff_id, servicio_id, fecha, hora, estado,
  duracion_minutos, hora_fin
on public.turno
for each row execute function turnly_private.enforce_turno_interval();

revoke update on public.turno from authenticated;
grant update (
  staff_id, servicio_id, cliente_id, cliente_nombre, cliente_telefono,
  cliente_email, fecha, hora, estado, pago_estado, pago_tipo, pago_id,
  requiere_sena, monto_sena, sena_pagada, mp_preference_id, updated_at
) on public.turno to authenticated;

revoke insert on public.turno from authenticated;
grant insert (
  negocio_id, staff_id, servicio_id, cliente_id, cliente_nombre,
  cliente_telefono, cliente_email, fecha, hora, estado, pago_estado, pago_tipo,
  pago_id, requiere_sena, monto_sena, sena_pagada, mp_preference_id, updated_at
) on public.turno to authenticated;
