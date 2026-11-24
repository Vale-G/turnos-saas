begin;
-- Read-only operational directory. The caller must have the existing superadmin role.
create function public.turnly_superadmin_directory(
  query text default '', lifecycle text default null, active_only boolean default null, page integer default 0
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare needle text:=lower(btrim(coalesce(query,''))); result jsonb;
begin
  if not turnly_private.is_superadmin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if length(needle)>120 or page is null or page<0 or page>2000
    or (lifecycle is not null and lifecycle not in ('trialing','active','past_due','canceled','expired')) then
    raise exception 'Filtros inválidos' using errcode='22023';
  end if;
  with business_rows as (
    select n.id,n.nombre,n.slug,n.activo,n.created_at,e.state,e.effective_plan
    from public.negocio n
    left join auth.users u on u.id=n.owner_id
    left join lateral turnly_private.commercial_effective(n.id) e on true
    where (active_only is null or n.activo=active_only)
      and (lifecycle is null or e.state=lifecycle)
      and (needle='' or strpos(lower(n.nombre),needle)>0 or strpos(lower(n.slug),needle)>0
        or n.id::text=needle or n.owner_id::text=needle or lower(u.email)=needle)
    order by n.created_at desc,n.id
    limit 26 offset page*25
  )
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc,b.id)
    from (select * from business_rows order by created_at desc,id limit 25) b),'[]'),
    'hasMore',(select count(*)>25 from business_rows))
  into result;
  return result;
end $$;
revoke all on function public.turnly_superadmin_directory(text,text,boolean,integer) from public,anon;
grant execute on function public.turnly_superadmin_directory(text,text,boolean,integer) to authenticated;
commit;
