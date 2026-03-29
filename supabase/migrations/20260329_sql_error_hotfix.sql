-- Hotfix for common SQL migration failures during manual execution
begin;

-- 1) Ensure required extension exists (gen_random_uuid)
create extension if not exists pgcrypto;

-- 2) Ensure auth trigger function exists before trigger creation attempts
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) RLS/policy idempotency guards
alter table if exists public.perfiles enable row level security;
alter table if exists public.negocio enable row level security;
alter table if exists public.staff enable row level security;
alter table if exists public.servicio enable row level security;
alter table if exists public.turno enable row level security;
alter table if exists public.suscripcion enable row level security;
alter table if exists public.config enable row level security;
alter table if exists public.adminrol enable row level security;
alter table if exists public.bloquehorario enable row level security;
alter table if exists public.clientenota enable row level security;

-- 4) Ensure superadmin bootstrap row for configured email if account exists
insert into public.adminrol (user_id, rol)
select id, 'superadmin'
from auth.users
where email = 'valepro50020@gmail.com'
on conflict (user_id) do update set rol = excluded.rol;

-- 5) Baseline config keys (safe upsert)
insert into public.config (clave, valor, descripcion) values
('precio_basico', '5000', 'Precio plan Basico en ARS'),
('precio_pro', '25000', 'Precio plan Pro en ARS'),
('dias_trial', '30', 'Dias de prueba gratuita')
on conflict (clave) do update set valor = excluded.valor;

commit;
