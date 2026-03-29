-- Turnly / Supabase final migration to normalize schema in snake_case lowercase
-- Date: 2026-03-29

begin;

-- ------------------------------------------------------------
-- 1) Drop legacy views/tables (quoted PascalCase)
-- ------------------------------------------------------------
drop view if exists public."Negocio" cascade;
drop view if exists public."Staff" cascade;
drop view if exists public."Servicio" cascade;
drop view if exists public."Turno" cascade;
drop view if exists public."AdminRol" cascade;
drop view if exists public."Config" cascade;
drop view if exists public."Suscripcion" cascade;
drop view if exists public."Perfiles" cascade;
drop view if exists public."BloqueHorario" cascade;
drop view if exists public."ClienteNota" cascade;

drop table if exists public."Turno" cascade;
drop table if exists public."Servicio" cascade;
drop table if exists public."Staff" cascade;
drop table if exists public."Negocio" cascade;
drop table if exists public."Config" cascade;
drop table if exists public."Suscripcion" cascade;
drop table if exists public."Perfiles" cascade;
drop table if exists public."AdminRol" cascade;
drop table if exists public."BloqueHorario" cascade;
drop table if exists public."ClienteNota" cascade;

-- ------------------------------------------------------------
-- 2) Core tables in lowercase/snake_case
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  avatar_url text,
  telefono text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.negocio (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  slug text not null unique,
  logo_url text,
  descripcion text,
  tema text default 'emerald',
  whatsapp text,
  onboarding_completo boolean not null default false,
  hora_apertura time,
  hora_cierre time,
  dias_laborales int[] default array[1,2,3,4,5],
  suscripcion_tipo text not null default 'normal',
  trial_hasta timestamptz,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  nombre text not null,
  avatar_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.servicio (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  nombre text not null,
  precio numeric(12,2) not null default 0,
  duracion integer not null default 30,
  created_at timestamptz not null default now()
);

create table if not exists public.turno (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  servicio_id uuid references public.servicio(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  cliente_id uuid references auth.users(id) on delete set null,
  cliente_nombre text,
  fecha date not null,
  hora time not null,
  estado text not null default 'pendiente',
  pago_estado text not null default 'pendiente',
  pago_tipo text,
  pago_id text,
  mp_preference_id text,
  requiere_sena boolean not null default false,
  monto_sena numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.suscripcion (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  plan text not null,
  estado text not null default 'pendiente',
  monto numeric(12,2),
  mp_payment_id text,
  mp_preference_id text,
  fecha_pago timestamptz,
  fecha_vencimiento timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.config (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor text not null,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adminrol (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.bloquehorario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  fecha date,
  hora_inicio time not null,
  hora_fin time not null,
  recurrente boolean not null default false,
  dia_semana integer,
  motivo text,
  created_at timestamptz not null default now()
);

create table if not exists public.clientenota (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  cliente_id uuid,
  cliente_nombre text,
  nota text,
  bloqueado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negocio_id, cliente_id)
);

create index if not exists idx_negocio_owner on public.negocio(owner_id);
create index if not exists idx_staff_negocio on public.staff(negocio_id);
create index if not exists idx_servicio_negocio on public.servicio(negocio_id);
create index if not exists idx_turno_negocio_fecha_hora on public.turno(negocio_id, fecha, hora);
create index if not exists idx_turno_staff_fecha on public.turno(staff_id, fecha);
create index if not exists idx_suscripcion_negocio on public.suscripcion(negocio_id);

-- ------------------------------------------------------------
-- 3) Trigger for auth.users -> perfiles
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4) Disable RLS temporarily for real-world smoke tests
-- ------------------------------------------------------------
alter table public.perfiles disable row level security;
alter table public.negocio disable row level security;
alter table public.staff disable row level security;
alter table public.servicio disable row level security;
alter table public.turno disable row level security;
alter table public.suscripcion disable row level security;
alter table public.config disable row level security;
alter table public.adminrol disable row level security;
alter table public.bloquehorario disable row level security;
alter table public.clientenota disable row level security;

commit;
