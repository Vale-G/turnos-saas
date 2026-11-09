-- Mercado Pago OAuth credentials are encrypted by the application before they
-- reach PostgreSQL. They live in a server-only table instead of the tenant row.
-- The legacy plaintext negocio.mp_access_token remains temporarily so an
-- existing connection can be migrated without breaking payments.
create table if not exists public.mercadopago_connection (
  negocio_id uuid primary key references public.negocio(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz not null,
  mp_user_id text not null,
  live_mode boolean not null default false,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.mercadopago_connection.access_token_encrypted is
  'AES-256-GCM encrypted Mercado Pago OAuth access token; server-only.';
comment on column public.mercadopago_connection.refresh_token_encrypted is
  'AES-256-GCM encrypted Mercado Pago OAuth refresh token; server-only.';

alter table public.mercadopago_connection enable row level security;
revoke all on public.mercadopago_connection from public, anon, authenticated;
grant select, insert, update, delete on public.mercadopago_connection to service_role;

-- The legacy plaintext credential must also remain server-only while old
-- connections are being replaced through OAuth.
revoke update (mp_access_token) on public.negocio from anon, authenticated;
