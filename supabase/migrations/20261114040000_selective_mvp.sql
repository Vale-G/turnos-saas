-- Customer reads use a narrow projection instead of granting access to workshop data.
create or replace function public.turnly_customer_history()
returns table(id uuid,fecha date,hora time,estado text,negocio_nombre text,servicio_nombre text)
language sql stable security definer set search_path = '' as $$
  select t.id,t.fecha,t.hora,t.estado,n.nombre,s.nombre
  from public.turno t join public.negocio n on n.id=t.negocio_id
  join public.servicio s on s.id=t.servicio_id
  where t.cliente_id=(select auth.uid()) and (select auth.uid()) is not null
  order by t.fecha desc,t.hora desc limit 200
$$;
revoke all on function public.turnly_customer_history() from public,anon;
grant execute on function public.turnly_customer_history() to authenticated;

alter table public.negocio add column if not exists banner_url text,
  add column if not exists mensaje_bienvenida text,
  add column if not exists recordatorios_activos boolean not null default false;
alter table public.negocio add constraint negocio_welcome_length check (length(mensaje_bienvenida)<=500);
alter table public.negocio add constraint negocio_banner_https check (banner_url is null or banner_url='' or (banner_url ~ '^https://[^[:space:]]+$' and length(banner_url)<=2048));
grant select(banner_url,mensaje_bienvenida,recordatorios_activos) on public.negocio to authenticated;
grant update(banner_url,mensaje_bienvenida,recordatorios_activos) on public.negocio to authenticated;
