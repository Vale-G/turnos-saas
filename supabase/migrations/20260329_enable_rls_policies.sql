-- Enable and harden RLS policies for production
begin;

-- Enable RLS
alter table public.perfiles enable row level security;
alter table public.negocio enable row level security;
alter table public.staff enable row level security;
alter table public.servicio enable row level security;
alter table public.turno enable row level security;
alter table public.suscripcion enable row level security;
alter table public.config enable row level security;
alter table public.adminrol enable row level security;
alter table public.bloquehorario enable row level security;
alter table public.clientenota enable row level security;

-- Reset old policies
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename IN (
      'perfiles','negocio','staff','servicio','turno','suscripcion','config','adminrol','bloquehorario','clientenota'
    )
  LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- perfiles
create policy perfiles_self_select on public.perfiles for select using (id = auth.uid());
create policy perfiles_self_update on public.perfiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy perfiles_self_insert on public.perfiles for insert with check (id = auth.uid());

-- adminrol
create policy adminrol_self_read on public.adminrol for select using (user_id = auth.uid());

-- negocio (owner)
create policy negocio_owner_select on public.negocio for select using (owner_id = auth.uid());
create policy negocio_owner_insert on public.negocio for insert with check (owner_id = auth.uid());
create policy negocio_owner_update on public.negocio for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy negocio_owner_delete on public.negocio for delete using (owner_id = auth.uid());

-- public business profile read for booking page (active only)
create policy negocio_public_read_active on public.negocio
for select
using (activo = true);

-- servicio/staff/bloquehorario by negocio owner
create policy servicio_owner_all on public.servicio
for all
using (exists (select 1 from public.negocio n where n.id = servicio.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = servicio.negocio_id and n.owner_id = auth.uid()));

create policy staff_owner_all on public.staff
for all
using (exists (select 1 from public.negocio n where n.id = staff.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = staff.negocio_id and n.owner_id = auth.uid()));

create policy bloquehorario_owner_all on public.bloquehorario
for all
using (exists (select 1 from public.negocio n where n.id = bloquehorario.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = bloquehorario.negocio_id and n.owner_id = auth.uid()));

create policy clientenota_owner_all on public.clientenota
for all
using (exists (select 1 from public.negocio n where n.id = clientenota.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = clientenota.negocio_id and n.owner_id = auth.uid()));

-- public read for booking essentials
create policy servicio_public_read on public.servicio
for select using (exists (select 1 from public.negocio n where n.id = servicio.negocio_id and n.activo = true));

create policy staff_public_read on public.staff
for select using (
  activo = true and exists (select 1 from public.negocio n where n.id = staff.negocio_id and n.activo = true)
);

create policy bloquehorario_public_read on public.bloquehorario
for select using (exists (select 1 from public.negocio n where n.id = bloquehorario.negocio_id and n.activo = true));

-- turno policies
create policy turno_owner_all on public.turno
for all
using (exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.owner_id = auth.uid()));

create policy turno_client_read_own on public.turno
for select
using (cliente_id = auth.uid());

create policy turno_client_insert_own on public.turno
for insert
with check (
  cliente_id = auth.uid()
  and exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.activo = true)
);

create policy turno_guest_insert_public on public.turno
for insert
with check (
  auth.uid() is null
  and cliente_id is null
  and estado = 'pendiente'
  and exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.activo = true)
);

-- suscripcion owner scope
create policy suscripcion_owner_all on public.suscripcion
for all
using (exists (select 1 from public.negocio n where n.id = suscripcion.negocio_id and n.owner_id = auth.uid()))
with check (exists (select 1 from public.negocio n where n.id = suscripcion.negocio_id and n.owner_id = auth.uid()));

-- config read-only for everyone authenticated/anon (public pricing on landing)
create policy config_public_read on public.config for select using (true);

-- only superadmin role can write config/adminrol
create policy config_superadmin_write on public.config
for all
using (exists (select 1 from public.adminrol a where a.user_id = auth.uid() and a.rol = 'superadmin'))
with check (exists (select 1 from public.adminrol a where a.user_id = auth.uid() and a.rol = 'superadmin'));

commit;
