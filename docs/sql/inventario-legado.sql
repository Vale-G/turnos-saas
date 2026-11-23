-- Read-only catalogue and counts. Rows and personal data are never emitted.
\set ON_ERROR_STOP on
begin transaction read only;
set local statement_timeout = '10s';
select current_database() as database_name, current_setting('server_version') as version;
do $$
declare target text; present regclass; total bigint;
begin
  foreach target in array array['turno','turnos','citas','horarios_bloqueados','bloqueo','bloquehorario','lista_negra','suscripcion'] loop
    present:=to_regclass(format('public.%I',target));
    if present is null then
      raise notice '%: ausente',target;
    else
      execute format('select count(*) from %s',present) into total;
      raise notice '%: % filas',target,total;
    end if;
  end loop;
end $$;
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('turnos','citas','horarios_bloqueados','lista_negra','suscripcion')
order by table_name,ordinal_position;
rollback;
