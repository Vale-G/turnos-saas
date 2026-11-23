create or replace function turnly_private.enforce_reschedule_advance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  business_timezone text;
begin
  if new.fecha is not distinct from old.fecha and new.hora is not distinct from old.hora then
    return new;
  end if;
  select zona_horaria into business_timezone from public.negocio where id = new.negocio_id;
  if business_timezone is null
     or (new.fecha::timestamp + new.hora) < (now() at time zone business_timezone) + interval '15 minutes' then
    raise exception using errcode = '23514', message = 'La reprogramación requiere al menos 15 minutos de anticipación';
  end if;
  return new;
end;
$$;

revoke all on function turnly_private.enforce_reschedule_advance() from public, anon, authenticated;

drop trigger if exists turno_reschedule_advance_guard on public.turno;
create trigger turno_reschedule_advance_guard
before update of fecha, hora on public.turno
for each row execute function turnly_private.enforce_reschedule_advance();

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
    and estado not in ('cancelado', 'completado')
    and manage_token_hash is not null
    and p_token ~ '^[0-9a-f]{64}$'
    and manage_token_hash = digest(p_token, 'sha256');
  return found;
end;
$$;

revoke all on function public.turnly_reschedule_public_booking(uuid, text, date, time without time zone, uuid)
  from public, anon, authenticated;
grant execute on function public.turnly_reschedule_public_booking(uuid, text, date, time without time zone, uuid)
  to service_role;
