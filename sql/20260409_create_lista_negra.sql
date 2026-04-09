create table if not exists public.lista_negra (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocio(id) on delete cascade,
  usuario_id uuid null,
  email text null,
  telefono text null,
  nombre text null,
  motivo text null,
  creado_en timestamptz not null default now(),
  identidad text generated always as (
    coalesce(
      usuario_id::text,
      lower(email),
      regexp_replace(coalesce(telefono, ''), '\D', '', 'g')
    )
  ) stored,
  constraint lista_negra_identidad_chk check (identidad is not null and length(identidad) > 0)
);

create unique index if not exists lista_negra_negocio_identidad_uidx
  on public.lista_negra (negocio_id, identidad);

create index if not exists lista_negra_negocio_idx
  on public.lista_negra (negocio_id);
