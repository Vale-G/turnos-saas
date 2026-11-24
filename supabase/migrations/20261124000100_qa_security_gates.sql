begin;

-- These tables are legacy/internal. Keep the existing service-role paths.
do $$
declare
  target regclass;
  columns text;
begin
  for target in
    select c.oid::regclass from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('mercadopago_connection', 'perfiles')
  loop
    execute format('alter table %s enable row level security', target);
    execute format('revoke all privileges on table %s from public, anon, authenticated', target);
    select string_agg(quote_ident(attname), ', ' order by attnum) into columns
    from pg_attribute where attrelid = target and attnum > 0 and not attisdropped;
    if columns is not null then
      execute format('revoke all privileges (%s) on table %s from public, anon, authenticated', columns, target);
    end if;
  end loop;
end
$$;

-- Turnly uses PostgREST. Close both GraphQL entry points without changing
-- the table grants or RLS that REST clients need.
do $$
begin
  if to_regprocedure('graphql_public.graphql(text,text,jsonb,jsonb)') is not null then
    revoke execute on function graphql_public.graphql(text,text,jsonb,jsonb) from public, anon, authenticated;
  end if;
  if to_regprocedure('graphql.resolve(text,jsonb,text,jsonb)') is not null then
    revoke execute on function graphql.resolve(text,jsonb,text,jsonb) from public, anon, authenticated;
  end if;
end
$$;

-- The application supplies the user's verified Auth ID, never request input.
-- Invoker is sufficient because this function is restricted to service_role.
create function public.turnly_server_customer_history(customer_id uuid, booking_id uuid default null)
returns table(id uuid, fecha date, hora time, estado text, negocio_nombre text, servicio_nombre text)
language sql stable security invoker set search_path = '' as $$
  select t.id, t.fecha, t.hora, t.estado, n.nombre, s.nombre
    from public.turno t
    join public.negocio n on n.id = t.negocio_id
    join public.servicio s on s.id = t.servicio_id
   where t.cliente_id = customer_id
     and (booking_id is null or t.id = booking_id)
   order by t.fecha desc, t.hora desc, t.id
   limit 200
$$;

revoke all on function public.turnly_server_customer_history(uuid, uuid) from public, anon, authenticated;
grant execute on function public.turnly_server_customer_history(uuid, uuid) to service_role;
revoke all on function public.turnly_customer_history() from public, anon, authenticated;

commit;
