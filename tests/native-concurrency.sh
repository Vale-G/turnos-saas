#!/usr/bin/env bash
set -euo pipefail

: "${TURNLY_TEST_DATABASE_URL:?TURNLY_TEST_DATABASE_URL is required}"
case "$TURNLY_TEST_DATABASE_URL" in
  postgresql://postgres:*@127.0.0.1:*/turnly_test|postgres://postgres:*@127.0.0.1:*/turnly_test) ;;
  *) echo "Refusing to use a non-local or non-turnly_test database" >&2; exit 2 ;;
esac

psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
SQL

psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/fixtures/schema.sql
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261031015309_booking_security_and_intervals.sql

qa_date="$(date -u -d '+2 days' +%F)"
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -v qa_date="$qa_date" <<'SQL'
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001');
insert into public.negocio(id, owner_id, nombre, slug, hora_apertura, hora_cierre, dias_laborales)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  'QA Concurrencia', 'qa-concurrencia', '00:00', '23:59:59', array[0,1,2,3,4,5,6]::smallint[]);
insert into public.servicio(id, negocio_id, nombre, duracion, precio)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Servicio QA', 60, 1000);
insert into public.staff(id, negocio_id, nombre)
values ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Profesional QA');
SQL

query="select pg_backend_pid(), * from public.turnly_create_public_booking(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '$qa_date', '10:00', null, 'Cliente QA', '+5491112345678', 'qa@example.com');"

set +e
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$query" > /tmp/turnly-booking-a.log 2>&1 &
pid_a=$!
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$query" > /tmp/turnly-booking-b.log 2>&1 &
pid_b=$!
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e

if [[ "$status_a" -eq 0 && "$status_b" -eq 0 ]] || [[ "$status_a" -ne 0 && "$status_b" -ne 0 ]]; then
  echo "Expected exactly one concurrent booking to succeed" >&2
  sed -n '1,20p' /tmp/turnly-booking-a.log >&2
  sed -n '1,20p' /tmp/turnly-booking-b.log >&2
  exit 1
fi

count="$(psql "$TURNLY_TEST_DATABASE_URL" -Atc "select count(*) from public.turno where staff_id='40000000-0000-4000-8000-000000000001' and fecha='$qa_date' and hora='10:00' and estado <> 'cancelado'")"
[[ "$count" = "1" ]] || { echo "Expected one persisted booking, got $count" >&2; exit 1; }

echo "Native concurrency PASS: one of two simultaneous requests persisted"
