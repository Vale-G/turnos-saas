-- Enforce commercial limits where writes happen. Frontend checks remain UX only.
create or replace function turnly_private.enforce_plan_resource_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_plan text;
  trial_expires timestamptz;
  current_count integer;
  max_count integer;
begin
  -- Serialize resource creation per tenant so concurrent requests cannot exceed a limit.
  perform pg_advisory_xact_lock(hashtextextended(new.negocio_id::text, 0));

  select suscripcion_tipo, trial_hasta
    into business_plan, trial_expires
  from public.negocio
  where id = new.negocio_id;

  if not found then
    raise exception using errcode = '23503', message = 'Negocio inexistente';
  end if;

  if business_plan = 'pro'
     or (business_plan = 'trial' and trial_expires is not null and trial_expires >= now()) then
    return new;
  end if;

  if tg_table_name = 'staff' then
    max_count := 2;
    select count(*) into current_count from public.staff where negocio_id = new.negocio_id;
    if current_count >= max_count then
      raise exception using errcode = '23514', message = 'El plan Básico permite hasta 2 profesionales';
    end if;
  elsif tg_table_name = 'servicio' then
    max_count := 5;
    select count(*) into current_count from public.servicio where negocio_id = new.negocio_id;
    if current_count >= max_count then
      raise exception using errcode = '23514', message = 'El plan Básico permite hasta 5 servicios';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists staff_plan_limit on public.staff;
create trigger staff_plan_limit
before insert on public.staff
for each row execute function turnly_private.enforce_plan_resource_limit();

drop trigger if exists servicio_plan_limit on public.servicio;
create trigger servicio_plan_limit
before insert on public.servicio
for each row execute function turnly_private.enforce_plan_resource_limit();

revoke all on function turnly_private.enforce_plan_resource_limit() from public, anon, authenticated;
