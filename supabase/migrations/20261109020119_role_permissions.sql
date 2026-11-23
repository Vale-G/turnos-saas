-- Enforce least-privilege roles inside each tenant. Tenant isolation alone is
-- insufficient: a staff member must not be able to change prices, personnel,
-- business settings or financial records.

create or replace function turnly_private.can_operate_business(target_negocio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.negocio n
    where n.id = target_negocio_id and n.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.adminrol ar
    where ar.user_id = (select auth.uid())
      and (ar.role = 'superadmin' or (ar.negocio_id = target_negocio_id and ar.role in ('owner','admin','staff')))
  );
$$;

create or replace function turnly_private.can_manage_business(target_negocio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.negocio n
    where n.id = target_negocio_id and n.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.adminrol ar
    where ar.user_id = (select auth.uid())
      and (ar.role = 'superadmin' or (ar.negocio_id = target_negocio_id and ar.role in ('owner','admin')))
  );
$$;

revoke all on function turnly_private.can_operate_business(uuid) from public, anon;
revoke all on function turnly_private.can_manage_business(uuid) from public, anon;
grant execute on function turnly_private.can_operate_business(uuid) to authenticated, service_role;
grant execute on function turnly_private.can_manage_business(uuid) to authenticated, service_role;

drop policy if exists negocio_tenant_update on public.negocio;
create policy negocio_manager_update on public.negocio for update to authenticated
  using (turnly_private.can_manage_business(id))
  with check (turnly_private.can_manage_business(id));

drop policy if exists servicio_tenant_all on public.servicio;
create policy servicio_team_select on public.servicio for select to authenticated
  using (turnly_private.can_access_business(negocio_id));
create policy servicio_manager_insert on public.servicio for insert to authenticated
  with check (turnly_private.can_manage_business(negocio_id));
create policy servicio_manager_update on public.servicio for update to authenticated
  using (turnly_private.can_manage_business(negocio_id))
  with check (turnly_private.can_manage_business(negocio_id));
create policy servicio_manager_delete on public.servicio for delete to authenticated
  using (turnly_private.can_manage_business(negocio_id));

drop policy if exists staff_tenant_all on public.staff;
create policy staff_team_select on public.staff for select to authenticated
  using (turnly_private.can_access_business(negocio_id));
create policy staff_manager_insert on public.staff for insert to authenticated
  with check (turnly_private.can_manage_business(negocio_id));
create policy staff_manager_update on public.staff for update to authenticated
  using (turnly_private.can_manage_business(negocio_id))
  with check (turnly_private.can_manage_business(negocio_id));
create policy staff_manager_delete on public.staff for delete to authenticated
  using (turnly_private.can_manage_business(negocio_id));

drop policy if exists turno_tenant_insert on public.turno;
drop policy if exists turno_tenant_update on public.turno;
drop policy if exists turno_tenant_delete on public.turno;
create policy turno_operator_insert on public.turno for insert to authenticated
  with check (turnly_private.can_operate_business(negocio_id));
create policy turno_operator_update on public.turno for update to authenticated
  using (turnly_private.can_operate_business(negocio_id))
  with check (turnly_private.can_operate_business(negocio_id));
create policy turno_manager_delete on public.turno for delete to authenticated
  using (turnly_private.can_manage_business(negocio_id));

drop policy if exists bloqueo_tenant_all on public.bloqueo;
create policy bloqueo_operator_all on public.bloqueo for all to authenticated
  using (negocio_id is not null and turnly_private.can_operate_business(negocio_id))
  with check (negocio_id is not null and turnly_private.can_operate_business(negocio_id));

drop policy if exists bloquehorario_tenant_all on public.bloquehorario;
create policy bloquehorario_operator_all on public.bloquehorario for all to authenticated
  using (turnly_private.can_operate_business(negocio_id))
  with check (turnly_private.can_operate_business(negocio_id));

drop policy if exists clientenota_tenant_all on public.clientenota;
create policy clientenota_operator_all on public.clientenota for all to authenticated
  using (turnly_private.can_operate_business(negocio_id))
  with check (turnly_private.can_operate_business(negocio_id));

drop policy if exists gasto_tenant_all on public.gasto;
create policy gasto_manager_all on public.gasto for all to authenticated
  using (negocio_id is not null and turnly_private.can_manage_business(negocio_id))
  with check (negocio_id is not null and turnly_private.can_manage_business(negocio_id));

drop policy if exists suscripcion_tenant_select on public.suscripcion;
create policy suscripcion_manager_select on public.suscripcion for select to authenticated
  using (turnly_private.can_manage_business(negocio_id));
