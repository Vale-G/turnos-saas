import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const fixture = new URL('./fixtures/schema.sql', import.meta.url)
const migration = new URL('../supabase/migrations/20261031015309_booking_security_and_intervals.sql', import.meta.url)
const hardeningMigration = new URL('../supabase/migrations/20261105211500_booking_interval_hardening.sql', import.meta.url)
const rescheduleMigration = new URL('../supabase/migrations/20261109014454_public_booking_reschedule.sql', import.meta.url)
const rolesMigration = new URL('../supabase/migrations/20261109020119_role_permissions.sql', import.meta.url)

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
  await db.exec(await readFile(rescheduleMigration, 'utf8'))
  await db.exec(await readFile(rolesMigration, 'utf8'))
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

test('staff opera la agenda pero no modifica configuración ni elimina turnos', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const staffUser = '10000000-0000-4000-8000-000000000003'
  await db.exec(`
    insert into auth.users(id) values ('${staffUser}');
    insert into public.adminrol(user_id, role, negocio_id)
      values ('${staffUser}', 'staff', '${ids.negocio}');
  `)
  const created = await book(db, ids, '16:00')

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${staffUser}'`)
  const visible = await db.query('select id from public.turno where id=$1', [created.rows[0].turno_id])
  assert.equal(visible.rows.length, 1)
  await db.query("update public.turno set estado='confirmado' where id=$1", [created.rows[0].turno_id])
  const serviceUpdate = await db.query("update public.servicio set precio=1 where id=$1 returning id", [ids.servicio])
  assert.equal(serviceUpdate.rows.length, 0)
  const deleted = await db.query('delete from public.turno where id=$1 returning id', [created.rows[0].turno_id])
  assert.equal(deleted.rows.length, 0)
  await db.exec('reset role')

  const stored = await db.query('select estado from public.turno where id=$1', [created.rows[0].turno_id])
  assert.equal(stored.rows[0].estado, 'confirmado')
  const service = await db.query('select precio from public.servicio where id=$1', [ids.servicio])
  assert.equal(Number(service.rows[0].precio), 1000)
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

test('el cliente reprograma con token válido y la base conserva la exclusión mutua', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const first = await book(db, ids, '10:00')
  const second = await book(db, ids, '12:00')
  const { turno_id: turnoId, manage_token: token } = first.rows[0]

  const invalid = await db.query(`select public.turnly_reschedule_public_booking(
    $1,$2,$3,'11:00',$4
  ) as changed`, [turnoId, '0'.repeat(64), tomorrow(), ids.staff])
  assert.equal(invalid.rows[0].changed, false)

  await assert.rejects(
    () => db.query(`select public.turnly_reschedule_public_booking($1,$2,$3,'11:30',$4)`,
      [turnoId, token, tomorrow(), ids.staff]),
    /horario ya no está disponible/i,
  )

  const moved = await db.query(`select public.turnly_reschedule_public_booking(
    $1,$2,$3,'13:00',$4
  ) as changed`, [turnoId, token, tomorrow(), ids.staff])
  assert.equal(moved.rows[0].changed, true)
  const stored = await db.query('select fecha,hora,hora_fin,duracion_minutos from public.turno where id=$1', [turnoId])
  assert.equal(stored.rows[0].fecha.toISOString().slice(0, 10), tomorrow())
  assert.deepEqual({ ...stored.rows[0], fecha: tomorrow() }, { fecha: tomorrow(), hora: '13:00:00', hora_fin: '14:00:00', duracion_minutos: 60 })

  await db.query("update public.turno set estado='completado' where id=$1", [turnoId])
  const completed = await db.query(`select public.turnly_reschedule_public_booking(
    $1,$2,$3,'15:00',$4
  ) as changed`, [turnoId, token, tomorrow(), ids.staff])
  assert.equal(completed.rows[0].changed, false)
  assert.ok(second.rows[0].turno_id)
})

test('anon no puede ejecutar la función privilegiada de reprogramación', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '10:00')
  await db.exec('set role anon')
  await assert.rejects(
    () => db.query(`select public.turnly_reschedule_public_booking($1,$2,$3,'13:00',$4)`,
      [created.rows[0].turno_id, created.rows[0].manage_token, tomorrow(), ids.staff]),
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

test('un turno cancelado no permite inyectar un intervalo falso y reactivarlo', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.owner}'`)
  await assert.rejects(
    () => db.query(`insert into public.turno(
      negocio_id,servicio_id,staff_id,fecha,hora,estado,duracion_minutos,hora_fin
    ) values ($1,$2,$3,$4,'12:00','cancelado',1,'12:01')`,
    [ids.negocio, ids.servicio, ids.staff, tomorrow()]),
    /permission denied/i,
  )

  const inserted = await db.query(`insert into public.turno(
    negocio_id,servicio_id,staff_id,fecha,hora,estado
  ) values ($1,$2,$3,$4,'12:00','cancelado') returning id,duracion_minutos,hora_fin`,
  [ids.negocio, ids.servicio, ids.staff, tomorrow()])
  assert.equal(inserted.rows[0].duracion_minutos, 60)
  assert.equal(inserted.rows[0].hora_fin, '13:00:00')

  await db.query("update public.turno set estado='pendiente' where id=$1", [inserted.rows[0].id])
  await db.exec('reset role')
  await assert.rejects(() => book(db, ids, '12:30'), /horario ya no está disponible/i)
})

test('reactivar recalcula un turno editado mientras estaba cancelado', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const shorter = '30000000-0000-4000-8000-000000000002'
  await db.query(`insert into public.servicio(id,negocio_id,nombre,duracion,precio)
    values ($1,$2,'Consulta corta',30,500)`, [shorter, ids.negocio])

  const created = await book(db, ids, '14:00')
  await db.query("update public.turno set estado='cancelado' where id=$1", [created.rows[0].turno_id])
  await db.query(`update public.turno set servicio_id=$1,hora='15:00' where id=$2`,
    [shorter, created.rows[0].turno_id])
  await db.query("update public.turno set estado='pendiente' where id=$1", [created.rows[0].turno_id])

  const stored = await db.query('select duracion_minutos,hora_fin from public.turno where id=$1',
    [created.rows[0].turno_id])
  assert.deepEqual(stored.rows[0], { duracion_minutos: 30, hora_fin: '15:30:00' })
})
