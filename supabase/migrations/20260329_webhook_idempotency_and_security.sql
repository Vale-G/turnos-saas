begin;

create table if not exists public.webhook_event (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  constraint webhook_event_provider_event_key_unique unique (provider, event_key)
);

alter table public.webhook_event enable row level security;

-- service role only in API routes; no anon/auth access needed
create policy webhook_event_no_direct_access on public.webhook_event
for all
using (false)
with check (false);

create index if not exists webhook_event_received_at_idx on public.webhook_event (received_at desc);

commit;
