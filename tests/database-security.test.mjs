import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const fixture = new URL('./fixtures/schema.sql', import.meta.url)
const migration = new URL('../supabase/migrations/20261031015309_booking_security_and_intervals.sql', import.meta.url)
const hardeningMigration = new URL('../supabase/migrations/20261105211500_booking_interval_hardening.sql', import.meta.url)

async function database() {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `)
  await db.exec(await readFile(fixture, 'utf8'))
  await db.exec(await readFile(migration, 'utf8'))
  await db.exec(await readFile(hardeningMigration, 'utf8'))
  return db
}

async function seed(db) {
  const owner = '10000000-0000-4000-8000-000000000001'
  const otherOwner = '10000000-0000-4000-8000-000000000002'
  const negocio = '20000000-0000-4000-8000-000000000001'
  const otherNegocio = '20000000-0000-4000-8000-000000000002'
  const servicio = '30000000-0000-4000-8000-000000000001'
  const staff = '40000000-0000-4000-8000-000000000001'
  await db.exec(`
    insert into auth.users(id) values ('${owner}'), ('${otherOwner}');
    insert into public.negocio(id, owner_id, nombre, slug, hora_apertura, hora_cierre, dias_laborales)
      values
      ('${negocio}', '${owner}', 'QA Uno', 'qa-uno', '08:00', '20:00', array[0,1,2,3,4,5,6]::smallint[]),
      ('${otherNegocio}', '${otherOwner}', 'QA Dos', 'qa-dos', '08:00', '20:00', array[0,1,2,3,4,5,6]::smallint[]);
    insert into public.servicio(id, negocio_id, nombre, duracion, precio)
      values ('${servicio}', '${negocio}', 'Consulta QA', 60, 1000);
    insert into public.staff(id, negocio_id, nombre)
      values ('${staff}', '${negocio}', 'Profesional QA');
  `)
  return { owner, negocio, otherNegocio, servicio, staff }
}

function tomorrow() {
  const date = new Date(Date.now() + 86400000)
  return date.toISOString().slice(0, 10)
}

async function book(db, ids, hour) {
  return db.query(`
    select * from public.turnly_create_public_booking(
      $1, $2, $3, $4, $5, null, 'Cliente QA', '+5491112345678', 'qa@example.com'
    )
  `, [ids.negocio, ids.servicio, ids.staff, tomorrow(), hour])
}

test('la migración aplica y una reserva adyacente no se considera superpuesta', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const first = await book(db, ids, '10:00')
  assert.match(first.rows[0].manage_token, /^[0-9a-f]{64}$/)
  await assert.rejects(() => book(db, ids, '10:30'), /horario ya no está disponible/i)
  const adjacent = await book(db, ids, '11:00')
  assert.equal(adjacent.rows.length, 1)
})

test('los bloqueos con segundos se respetan en la base', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  await db.query(`insert into public.bloqueo(negocio_id, staff_id, fecha, hora_inicio, hora_fin)
    values ($1, $2, $3, '09:30:00', '10:00:59')`, [ids.negocio, ids.staff, tomorrow()])
  await assert.rejects(() => book(db, ids, '10:00'), /horario está bloqueado/i)
})

test('anon no puede leer tablas y RLS separa negocios autenticados', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  await db.exec('set role anon')
  await assert.rejects(() => db.query('select id from public.negocio'), /permission denied/i)
  await db.exec('reset role')

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.owner}'`)
  const visible = await db.query('select id from public.negocio')
  assert.deepEqual(visible.rows.map((row) => row.id), [ids.negocio])
  await db.exec('reset role')
})

test('el enlace de gestión usa un token opaco y cancela sin exponer el turno', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '12:00')
  const { turno_id: turnoId, manage_token: token } = created.rows[0]
  const invalid = await db.query('select public.turnly_verify_manage_token($1, $2) as valid', [turnoId, '0'.repeat(64)])
  assert.equal(invalid.rows[0].valid, false)
  const cancelled = await db.query('select public.turnly_cancel_public_booking($1, $2) as cancelled', [turnoId, token])
  assert.equal(cancelled.rows[0].cancelled, true)
  const stored = await db.query('select estado from public.turno where id = $1', [turnoId])
  assert.equal(stored.rows[0].estado, 'cancelado')

  await db.exec('set role anon')
  await assert.rejects(
    () => db.query('select public.turnly_verify_manage_token($1, $2)', [turnoId, token]),
    /permission denied/i,
  )
  await db.exec('reset role')
})

test('los webhooks aplican importes reales una sola vez', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '14:00')
  const turnoId = created.rows[0].turno_id
  const wrong = await db.query(`select public.turnly_apply_booking_payment(
    'payment:qa:approved','qa-payment',$1,'full','approved',999,'ARS') as applied`, [turnoId])
  assert.equal(wrong.rows[0].applied, false)
  const applied = await db.query(`select public.turnly_apply_booking_payment(
    'payment:qa:approved','qa-payment',$1,'full','approved',1000,'ARS') as applied`, [turnoId])
  assert.equal(applied.rows[0].applied, true)
  const duplicate = await db.query(`select public.turnly_apply_booking_payment(
    'payment:qa:approved','qa-payment',$1,'full','approved',1000,'ARS') as applied`, [turnoId])
  assert.equal(duplicate.rows[0].applied, true)
  const rows = await db.query("select estado,pago_estado,pago_id from public.turno where id=$1", [turnoId])
  assert.deepEqual(rows.rows[0], { estado: 'confirmado', pago_estado: 'approved', pago_id: 'qa-payment' })
  const events = await db.query("select count(*)::int as count from public.webhook_event where event_key='payment:qa:approved'")
  assert.equal(events.rows[0].count, 1)
})

test('un turno legado sin snapshot usa la duración del servicio y bloquea solapamientos', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  await db.exec('drop trigger turno_interval_guard on public.turno')
  await db.query(`insert into public.turno(negocio_id,servicio_id,staff_id,fecha,hora,estado,duracion_minutos,hora_fin)
    values ($1,$2,$3,$4,'10:00','pendiente',null,null)`, [ids.negocio, ids.servicio, ids.staff, tomorrow()])
  await db.exec(`create trigger turno_interval_guard
    before insert or update of negocio_id,staff_id,servicio_id,fecha,hora,estado,duracion_minutos,hora_fin
    on public.turno for each row execute function turnly_private.enforce_turno_interval()`)
  await assert.rejects(() => book(db, ids, '10:30'), /horario ya no está disponible/i)
})

test('authenticated no puede alterar las columnas derivadas del intervalo', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '12:00')
  const turnoId = created.rows[0].turno_id

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.owner}'`)
  await assert.rejects(
    () => db.query(`update public.turno set duracion_minutos=1,hora_fin='12:01' where id=$1`, [turnoId]),
    /permission denied/i,
  )
  await db.exec('reset role')
  await assert.rejects(() => book(db, ids, '12:30'), /horario ya no está disponible/i)
})

test('un cambio de estado conserva el snapshot histórico de duración', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '15:00')
  const turnoId = created.rows[0].turno_id
  await db.query('update public.servicio set duracion=30 where id=$1', [ids.servicio])
  await db.query("update public.turno set estado='confirmado' where id=$1", [turnoId])
  const stored = await db.query('select duracion_minutos,hora_fin from public.turno where id=$1', [turnoId])
  assert.deepEqual(stored.rows[0], { duracion_minutos: 60, hora_fin: '16:00:00' })
})
