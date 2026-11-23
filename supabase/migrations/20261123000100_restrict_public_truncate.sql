begin;

-- TRUNCATE omits row-level policies. PostgREST roles only need row-based operations.
revoke truncate on all tables in schema public from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'f')
      and (has_table_privilege('anon', c.oid, 'TRUNCATE')
        or has_table_privilege('authenticated', c.oid, 'TRUNCATE'))
  ) then
    raise exception 'Persisten privilegios efectivos TRUNCATE en public; revisar membresías y propietarios';
  end if;
end
$$;

commit;
