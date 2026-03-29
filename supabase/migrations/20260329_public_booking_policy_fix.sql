-- Fix public booking visibility by slug (existing projects with RLS already applied)
begin;

drop policy if exists negocio_public_read_active on public.negocio;
create policy negocio_public_read_active on public.negocio
for select
using (slug is not null);

commit;
