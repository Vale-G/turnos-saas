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
for migration in supabase/migrations/202611*.sql; do
  # This fixture intentionally excludes legacy plural tables and their helper.
  [[ "$migration" == *legacy_sandbox_surface_lockdown.sql ]] && continue
  psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done

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

query="select turno_id from public.turnly_book_with_policy(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '$qa_date', '10:00', null, 'Cliente QA', '+5491112345678', 'qa@example.com',false);"

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

# The trial starts with one professional. Add three so both writers compete for the fifth.
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
insert into public.staff(negocio_id,nombre)
select '20000000-0000-4000-8000-000000000001','Fixture '||n from generate_series(1,3) n;
SQL
if psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  begin;
  insert into public.staff(negocio_id,nombre) values ('20000000-0000-4000-8000-000000000001','Competidor A');
  select pg_sleep(1);
  commit" >/tmp/turnly-commercial-staff-a.log 2>&1 &
  commercial_a=$!
  psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  insert into public.staff(negocio_id,nombre) values ('20000000-0000-4000-8000-000000000001','Competidor B')"     >/tmp/turnly-commercial-staff-b.log 2>&1 &
  commercial_b=$!
  a_result=0; b_result=0
  wait "$commercial_a" || a_result=$?
  wait "$commercial_b" || b_result=$?
  [[ "$a_result" -eq 0 && "$b_result" -ne 0 || "$a_result" -ne 0 && "$b_result" -eq 0 ]]
then
  grep -q 'Límite de profesionales alcanzado' /tmp/turnly-commercial-staff-{a,b}.log
else
  cat /tmp/turnly-commercial-staff-{a,b}.log >&2
  exit 1
fi
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if (select count(*) from public.staff where negocio_id='20000000-0000-4000-8000-000000000001')<>5 then
    raise exception 'Límite concurrente de profesionales incumplido';
  end if;
end $$;
SQL
echo "Native commercial concurrency PASS: only one writer got the last trial seat"

psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
insert into turnly_private.commercial_price values ('pro',42,'ARS');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select public.turnly_commercial_request('change_plan','pro');
select public.turnly_commercial_stage_invoice(
  '20000000-0000-4000-8000-000000000001','fixture-subscription','fixture-invoice',
  current_date::timestamp at time zone 'UTC',
  (current_date+interval '1 month') at time zone 'UTC'
);
SQL
payment_sql="select public.turnly_commercial_record_payment('fixture-invoice','fixture-subscription','fixture-payment','approved',42,'ARS')"
fixture_payments=$(mktemp -d)
trap 'rm -rf "$fixture_payments"' EXIT
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$payment_sql" >"$fixture_payments/a" &
payment_a=$!
psql "$TURNLY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "$payment_sql" >"$fixture_payments/b" &
payment_b=$!
wait "$payment_a"
wait "$payment_b"
[[ "$(cat "$fixture_payments/a")" = t && "$(cat "$fixture_payments/b")" = t ]]
[[ "$(psql "$TURNLY_TEST_DATABASE_URL" -Atc "select count(*) from turnly_private.commercial_audit where event='payment_approved'")" = 1 ]]
echo "Native commercial payment PASS: replay recorded one approval"
