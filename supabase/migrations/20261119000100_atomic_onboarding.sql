-- The server derives p_owner from the authenticated session.
create function public.turnly_open_business(
  p_owner uuid, p_nombre text, p_slug text, p_whatsapp text, p_tema text,
  p_rubro text, p_estilo text, p_modo text, p_apertura time, p_cierre time,
  p_trial_hasta timestamptz
) returns uuid language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  created_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 0));
  if exists (select 1 from public.negocio where owner_id = p_owner) then
    raise exception using errcode = '23505', message = 'La cuenta ya tiene un negocio';
  end if;
  insert into public.negocio(owner_id, nombre, slug, whatsapp, tema, rubro, estilo_visual,
    modo_visual, hora_apertura, hora_cierre, suscripcion_tipo, trial_hasta, onboarding_completo)
  values(p_owner, p_nombre, p_slug, p_whatsapp, p_tema, p_rubro, p_estilo,
    p_modo, p_apertura, p_cierre, 'trial', p_trial_hasta, true)
  returning id into created_id;

  insert into public.adminrol(user_id, role, negocio_id) values(p_owner, 'owner', created_id)
  on conflict (user_id) do update set negocio_id = excluded.negocio_id
  where adminrol.role in ('superadmin', 'owner') and adminrol.negocio_id is null;
  if not found then
    raise exception using errcode = '23505', message = 'La cuenta ya tiene un rol asignado';
  end if;
  return created_id;
end;
$$;
revoke all on function public.turnly_open_business(uuid,text,text,text,text,text,text,text,time,time,timestamptz) from public, anon, authenticated;
grant execute on function public.turnly_open_business(uuid,text,text,text,text,text,text,text,time,time,timestamptz) to service_role;
