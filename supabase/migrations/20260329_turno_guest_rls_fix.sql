-- Fix guest booking inserts under RLS + prevent duplicate active slots
begin;

-- Ensure anon and authenticated inserts are both covered by explicit policies
 drop policy if exists turno_guest_insert_public on public.turno;
 drop policy if exists turno_client_insert_own on public.turno;

create policy turno_client_insert_own on public.turno
for insert
with check (
  cliente_id = auth.uid()
  and exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.activo = true)
);

create policy turno_guest_insert_public on public.turno
for insert
with check (
  cliente_id is null
  and estado = 'pendiente'
  and exists (select 1 from public.negocio n where n.id = turno.negocio_id and n.activo = true)
);

-- Prevent double-booking same staff/date/time while appointment is active
create unique index if not exists ux_turno_staff_fecha_hora_activo
on public.turno (staff_id, fecha, hora)
where estado <> 'cancelado';

commit;
