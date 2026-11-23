alter table public.negocio
  add column if not exists rubro text not null default 'general',
  add column if not exists estilo_visual text not null default 'sereno',
  add column if not exists modo_visual text not null default 'oscuro';

alter table public.negocio drop constraint if exists negocio_rubro_chk;
alter table public.negocio add constraint negocio_rubro_chk
  check (rubro in ('general','salud','belleza','cabello','unas','bienestar','profesional'));

alter table public.negocio drop constraint if exists negocio_estilo_visual_chk;
alter table public.negocio add constraint negocio_estilo_visual_chk
  check (estilo_visual in ('sereno','minimal','editorial','audaz'));

alter table public.negocio drop constraint if exists negocio_modo_visual_chk;
alter table public.negocio add constraint negocio_modo_visual_chk
  check (modo_visual in ('oscuro','claro'));

grant select (rubro, estilo_visual, modo_visual) on public.negocio to authenticated;
grant update (rubro, estilo_visual, modo_visual) on public.negocio to authenticated;

comment on column public.negocio.rubro is 'Categoría visual y de lenguaje elegida por el negocio.';
comment on column public.negocio.estilo_visual is 'Sistema de forma aplicado a la reserva pública.';
comment on column public.negocio.modo_visual is 'Contraste claro u oscuro de la experiencia pública.';
