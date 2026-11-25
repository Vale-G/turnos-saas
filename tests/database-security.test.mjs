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
const notificationMigration = new URL('../supabase/migrations/20261110103749_notification_delivery.sql', import.meta.url)
const personalizationMigration = new URL('../supabase/migrations/20261112214500_business_personalization.sql', import.meta.url)
const planLimitsMigration = new URL('../supabase/migrations/20261113190000_plan_limits_and_payment_access.sql', import.meta.url)

async function database(seedLegacy) {
  const db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema extensions;
    create table auth.users (id uuid primary key, email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `)
  await db.exec(await readFile(fixture, 'utf8'))
  if (seedLegacy) await seedLegacy(db)
  await db.exec(await readFile(migration, 'utf8'))
  await db.exec(await readFile(hardeningMigration, 'utf8'))
  await db.exec(await readFile(rescheduleMigration, 'utf8'))
  await db.exec(await readFile(rolesMigration, 'utf8'))
  await db.exec(await readFile(notificationMigration, 'utf8'))
  await db.exec(await readFile(personalizationMigration, 'utf8'))
  await db.exec(await readFile(planLimitsMigration, 'utf8'))
  try {
    await db.exec(await readFile(new URL('../supabase/migrations/20261114040000_selective_mvp.sql', import.meta.url), 'utf8'))
    await db.exec(await readFile(new URL('../supabase/migrations/20261114040100_reminder_delivery.sql', import.meta.url), 'utf8'))
    for (const file of ["20261118000100_owner_operations.sql", "20261118000200_owner_insights.sql", "20261119000100_atomic_onboarding.sql"]) await db.exec(await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8"))
  } catch (error) { await db.close(); throw error }
  return db
}

test('los límites del plan se aplican en PostgreSQL y no solo en la interfaz', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  await db.query("update public.negocio set suscripcion_tipo='basico',trial_hasta=null where id=$1", [ids.negocio])

  await db.query("insert into public.staff(negocio_id,nombre) values ($1,'Segundo')", [ids.negocio])
  await assert.rejects(
    () => db.query("insert into public.staff(negocio_id,nombre) values ($1,'Tercero')", [ids.negocio]),
    /Básico permite hasta 2 profesionales/i,
  )

  for (let i = 2; i <= 5; i++) {
    await db.query('insert into public.servicio(negocio_id,nombre,precio,duracion) values ($1,$2,100,30)', [ids.negocio, `Servicio ${i}`])
  }
  await assert.rejects(
    () => db.query("insert into public.servicio(negocio_id,nombre,precio,duracion) values ($1,'Sexto',100,30)", [ids.negocio]),
    /Básico permite hasta 5 servicios/i,
  )

  await db.query("update public.negocio set suscripcion_tipo='pro' where id=$1", [ids.negocio])
  await db.query("insert into public.staff(negocio_id,nombre) values ($1,'Tercero Pro')", [ids.negocio])
  await db.query("insert into public.servicio(negocio_id,nombre,precio,duracion) values ($1,'Sexto Pro',100,30)", [ids.negocio])
})

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

test('el historial se sirve solo al backend y devuelve la reserva del cliente correcto', async t => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const booking = await book(db, ids, '10:00')
  const id = booking.rows[0].turno_id
  await db.query('update public.turno set cliente_id=$1 where id=$2', [ids.owner, id])
  await db.exec(`
    create schema graphql;
    create schema graphql_public;
    create function graphql.resolve(query text, variables jsonb, "operationName" text, extensions jsonb)
      returns jsonb language sql as $$ select jsonb_build_object('role', current_user::text, 'query', query) $$;
    create function graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb)
      returns jsonb language sql security invoker as $$
        select graphql.resolve(query := query, variables := coalesce(variables, '{}'),
          "operationName" := "operationName", extensions := extensions);
      $$;
    grant usage on schema graphql, graphql_public to anon, authenticated, service_role;
    revoke all on function graphql_public.graphql(text,text,jsonb,jsonb) from public;
    grant execute on function graphql_public.graphql(text,text,jsonb,jsonb) to service_role, anon, authenticated;
    create table public.perfiles (id integer, nombre text);
    grant select (nombre) on public.perfiles to authenticated;
    grant select on public.perfiles to anon;
    grant select on public.perfiles to service_role;
    grant select, update on public.mercadopago_connection to service_role;
    grant update(access_token_encrypted) on public.mercadopago_connection to authenticated;
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/20261124000100_qa_security_gates.sql', import.meta.url), 'utf8'))
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`)
    await assert.rejects(() => db.query('select * from public.turnly_customer_history()'), /permission denied/i)
    await assert.rejects(() => db.query('select * from public.turnly_server_customer_history($1)', [ids.owner]), /permission denied/i)
    await assert.rejects(() => db.query('select graphql_public.graphql(null,null,null,null)'), /permission denied/i)
    await assert.rejects(() => db.query('select graphql.resolve(null,null,null,null)'), /permission denied/i)
    await assert.rejects(() => db.query('select nombre from public.perfiles'), /permission denied/i)
    await assert.rejects(() => db.query("update public.mercadopago_connection set access_token_encrypted='fixture'"), /permission denied/i)
    await db.exec('reset role')
  }
  await db.exec('set role service_role')
  const graphql = await db.query("select graphql_public.graphql(null, '{ __typename }', null, null) as result")
  assert.deepEqual(graphql.rows[0].result, { role: 'service_role', query: '{ __typename }' })
  const own = await db.query('select * from public.turnly_server_customer_history($1, $2)', [ids.owner, id])
  assert.equal(own.rows.length, 1)
  assert.equal(own.rows[0].id, id)
  assert.deepEqual(Object.keys(own.rows[0]).sort(), ['estado', 'fecha', 'hora', 'id', 'negocio_nombre', 'servicio_nombre'])
  assert.equal((await db.query('select * from public.turnly_server_customer_history($1, $2)', [
    '10000000-0000-4000-8000-000000000002', id,
  ])).rows.length, 0)
  await db.query('select nombre from public.perfiles')
  await db.query('select access_token_encrypted from public.mercadopago_connection')
})

test('banner y bienvenida respetan RLS y validan contenido', async t => {
  const db=await database(); t.after(()=>db.close()); const ids=await seed(db)
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${ids.owner}'`)
  await db.query("update public.negocio set banner_url='https://example.com/banner.jpg',mensaje_bienvenida='Hola',recordatorios_activos=true where id=$1",[ids.negocio])
  const foreign=await db.query("update public.negocio set mensaje_bienvenida='Ajeno' where id=$1 returning id",[ids.otherNegocio])
  assert.equal(foreign.rows.length,0)
  await assert.rejects(()=>db.query("update public.negocio set banner_url='javascript:alert(1)' where id=$1",[ids.negocio]),/negocio_banner_https/i)
})

test('recordatorios se reclaman una sola vez y roles públicos no pueden enviarlos', async t => {
  const db=await database(); t.after(()=>db.close()); const ids=await seed(db)
  const b=await book(db,ids,'10:00'); const id=b.rows[0].turno_id
  const kind=`reminder:${tomorrow()}:10:00:00`
  assert.equal((await db.query('select public.turnly_claim_notification($1,$2) as claimed',[id,kind])).rows[0].claimed,true)
  assert.equal((await db.query('select public.turnly_claim_notification($1,$2) as claimed',[id,kind])).rows[0].claimed,false)
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${ids.owner}'`)
  await assert.rejects(()=>db.query('select public.turnly_claim_notification($1,$2)',[id,kind]),/permission denied/i)
})

test('la personalización usa valores seguros y solo el negocio autenticado puede cambiarla', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)

  const defaults = await db.query(
    'select rubro, estilo_visual, modo_visual from public.negocio where id = $1',
    [ids.negocio],
  )
  assert.deepEqual(defaults.rows[0], {
    rubro: 'general',
    estilo_visual: 'sereno',
    modo_visual: 'oscuro',
  })

  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.owner}'`)
  await db.query(
    `update public.negocio
      set rubro = 'salud', estilo_visual = 'minimal', modo_visual = 'claro'
      where id = $1`,
    [ids.negocio],
  )
  await assert.rejects(
    () => db.query("update public.negocio set rubro = 'arbitrario' where id = $1", [ids.negocio]),
    /negocio_rubro_chk/i,
  )
  await db.exec('reset role')

  const changed = await db.query(
    'select rubro, estilo_visual, modo_visual from public.negocio where id = $1',
    [ids.negocio],
  )
  assert.deepEqual(changed.rows[0], {
    rubro: 'salud',
    estilo_visual: 'minimal',
    modo_visual: 'claro',
  })
  const other = await db.query(
    'select rubro, estilo_visual, modo_visual from public.negocio where id = $1',
    [ids.otherNegocio],
  )
  assert.deepEqual(other.rows[0], {
    rubro: 'general',
    estilo_visual: 'sereno',
    modo_visual: 'oscuro',
  })
})

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

test('la entrega de correo se reclama una vez y permite reintentar un fallo', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const ids = await seed(db)
  const created = await book(db, ids, '17:00')
  const turnoId = created.rows[0].turno_id
  const first = await db.query("select public.turnly_claim_notification($1,'customer-confirmation') as claimed", [turnoId])
  const duplicate = await db.query("select public.turnly_claim_notification($1,'customer-confirmation') as claimed", [turnoId])
  assert.equal(first.rows[0].claimed, true)
  assert.equal(duplicate.rows[0].claimed, false)
  const failed = await db.query("select public.turnly_complete_notification($1,'customer-confirmation','failed',null,'qa') as completed", [turnoId])
  assert.equal(failed.rows[0].completed, true)
  const retry = await db.query("select public.turnly_claim_notification($1,'customer-confirmation') as claimed", [turnoId])
  assert.equal(retry.rows[0].claimed, true)
  await db.query("select public.turnly_complete_notification($1,'customer-confirmation','sent','email-qa',null)", [turnoId])
  const afterSent = await db.query("select public.turnly_claim_notification($1,'customer-confirmation') as claimed", [turnoId])
  assert.equal(afterSent.rows[0].claimed, false)
  await db.exec('set role anon')
  await assert.rejects(() => db.query("select public.turnly_claim_notification($1,'customer-confirmation')", [turnoId]), /permission denied/i)
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

test('informes del dueño aplican permisos y usan precios acordados', async t => {
  const db = await database(); t.after(()=>db.close())
  const ids = await seed(db)
  const booking = (await book(db,ids,'10:00')).rows[0]
  await db.query("update public.servicio set precio=2000 where id=$1",[ids.servicio])
  assert.equal(Number((await db.query("select precio_acordado from public.turno where id=$1",[booking.turno_id])).rows[0].precio_acordado),1000)
  await db.query("update public.negocio set suscripcion_tipo='pro' where id=$1",[ids.negocio])
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${ids.owner}'`)
  const query="select public.turnly_owner_insights($1,date_trunc('month',current_date)::date) report"
  const report=(await db.query(query,[ids.negocio])).rows[0].report
  assert.equal(report.periods.length,2)
  assert.equal(report.cohorts.length,3)
  assert.ok(report.heat.length>0)
  await assert.rejects(()=>db.query(query,[ids.otherNegocio]),/Acceso denegado/)
})

test('seña obligatoria, excepción del servicio y plazos del enlace se validan en la base',async t=>{
  const db=await database(); t.after(()=>db.close()); const ids=await seed(db)
  await db.query("update public.negocio set politica_sena='obligatoria',horas_cancelacion=720,horas_reprogramacion=720 where id=$1",[ids.negocio])
  const query="select * from public.turnly_book_with_policy($1,$2,$3,$4,$5,null,'QA prueba','1123456789','qa@example.invalid',$6)"
  const args=[ids.negocio,ids.servicio,ids.staff,tomorrow(),'11:00']
  await assert.rejects(()=>db.query(query,[...args,false]),/requiere seña/)
  const {turno_id,manage_token,obligatoria}=(await db.query(query,[...args,true])).rows[0]
  assert.equal(obligatoria,true)
  await assert.rejects(()=>db.query("update public.turno set estado='confirmado' where id=$1",[turno_id]),/no está cobrada/)
  assert.equal((await db.query('select public.turnly_cancel_public_booking($1,$2) ok',[turno_id,manage_token])).rows[0].ok,false)
  assert.equal((await db.query("select public.turnly_reschedule_public_booking($1,$2,$3,'12:00',$4) ok",[turno_id,manage_token,tomorrow(),ids.staff])).rows[0].ok,false)
  await db.query("update public.servicio set politica_sena='ninguna' where id=$1",[ids.servicio])
  assert.equal((await db.query(query,[...args.slice(0,4),'13:00',false])).rows[0].obligatoria,false)
  await db.query("update public.negocio set horas_cancelacion=0 where id=$1",[ids.negocio])
  await db.query('select public.turnly_cancel_public_booking($1,$2)',[turno_id,manage_token])
  const cancelled=(await db.query('select cancelado_por,cancelado_en from public.turno where id=$1',[turno_id])).rows[0]
  assert.equal(cancelled.cancelado_por,'cliente');assert.ok(cancelled.cancelado_en)
})

test('reemplazos parciales, seña y saldo usan mediciones independientes',async t=>{
  const db=await database(); t.after(()=>db.close()); const ids=await seed(db)
  await db.query("update public.negocio set suscripcion_tipo='pro' where id=$1",[ids.negocio])
  const original=(await book(db,ids,'14:00')).rows[0]
  await db.query('select public.turnly_cancel_public_booking($1,$2)',[original.turno_id,original.manage_token])
  await db.query("update public.servicio set duracion=30 where id=$1",[ids.servicio])
  const replacement=(await book(db,ids,'14:00')).rows[0]
  await db.query('update public.turno set monto_sena=300 where id=$1',[replacement.turno_id])
  await db.query("select public.turnly_apply_booking_payment('qa:deposit','deposit',$1,'sena','approved',300,'ARS')",[replacement.turno_id])
  await db.query("update public.servicio set precio=5000 where id=$1",[ids.servicio])
  const full="select public.turnly_apply_booking_payment('qa:balance','balance',$1,'full','approved',$2,'ARS') ok"
  assert.equal((await db.query(full,[replacement.turno_id,1000])).rows[0].ok,false)
  assert.equal((await db.query(full,[replacement.turno_id,700])).rows[0].ok,true)
  const row=(await db.query('select saldo_mp,monto_sena,sena_pagada from public.turno where id=$1',[replacement.turno_id])).rows[0]
  assert.equal(Number(row.saldo_mp),700);assert.equal(row.sena_pagada,true)
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${ids.owner}'`)
  const report=(await db.query("select public.turnly_owner_insights($1,date_trunc('month',$2::date)::date) result",[ids.negocio,tomorrow()])).rows[0].result
  assert.equal(report.recovery.lost,60);assert.equal(report.recovery.recovered,30)
})

test('cohortes con ventanas maduras, bloqueos solapados y precios históricos desconocidos',async t=>{
  let ids
  const db=await database(async db=>{
    ids=await seed(db)
    await db.query("update public.negocio set suscripcion_tipo='pro' where id=$1",[ids.negocio])
    await db.query(`insert into public.turno(negocio_id,staff_id,servicio_id,cliente_id,estado,fecha,hora)
      select $1,$2,$3,$4,'completado',(date_trunc('month',current_date)-interval '5 months')::date + offset_days,'09:00'
      from unnest(array[0,40]) offset_days`,[ids.negocio,ids.staff,ids.servicio,ids.owner])
  });t.after(()=>db.close())
  await db.exec(`set role authenticated;set request.jwt.claim.sub='${ids.owner}'`)
  const report=(await db.query("select public.turnly_owner_insights($1,(date_trunc('month',current_date)-interval '5 months')::date) result",[ids.negocio])).rows[0].result
  assert.deepEqual(report.cohorts.map(c=>[c.horizon,c.eligible,c.returned]),[[30,1,0],[60,1,1],[90,1,1]])
  assert.equal(report.durations.length,0)
  const historic=await db.query('select precio_acordado from public.turno where negocio_id=$1',[ids.negocio])
  assert.ok(historic.rows.every(t=>t.precio_acordado===null))
  const query="select public.turnly_owner_insights($1,date_trunc('month',current_date)::date) result"
  const before=(await db.query(query,[ids.negocio])).rows[0].result
  const insert="insert into public.bloqueo(negocio_id,staff_id,fecha,hora_inicio,hora_fin) values ($1,$2,(now() at time zone 'America/Argentina/Buenos_Aires')::date,$3,$4)"
  await db.query(insert,[ids.negocio,ids.staff,'10:00','10:45'])
  await db.query(insert,[ids.negocio,ids.staff,'10:30','11:00'])
  const after=(await db.query(query,[ids.negocio])).rows[0].result
  const hours=r=>r.heat.reduce((s,h)=>s+h.offered,0)
  assert.equal(hours(before)-hours(after),60)
})

test('alta atómica conserva roles existentes y revierte el negocio si la asignación falla', async t => {
  const db = await database()
  t.after(() => db.close())
  const { negocio } = await seed(db)
  const user = '10000000-0000-4000-8000-000000000003'
  await db.query('insert into auth.users(id) values ($1)', [user])
  await db.query("insert into public.adminrol(user_id,role,negocio_id) values ($1,'staff',$2)", [user,negocio])
  const open = () => db.query("select public.turnly_open_business($1,'Local','local-test','','emerald','general','sereno','claro','09:00','18:00',now())", [user])
  await db.exec('set role service_role')
  await assert.rejects(open, /rol asignado/)
  assert.equal((await db.query("select count(*)::int as n from public.negocio where owner_id=$1", [user])).rows[0].n, 0)
  await db.exec('reset role')
  await db.query("update public.adminrol set role='superadmin',negocio_id=null where user_id=$1", [user])
  await db.exec('set role service_role')
  await open()
  await assert.rejects(open, /ya tiene un negocio/)
  assert.equal((await db.query('select role from public.adminrol where user_id=$1', [user])).rows[0].role, 'superadmin')
  await db.exec('set role authenticated')
  await assert.rejects(open, /permission denied/)
})

test('el cierre de TRUNCATE preserva operaciones por fila y detecta grants heredados', async (t) => {
  const db = await database()
  t.after(() => db.close())
  const migration = await readFile(new URL('../supabase/migrations/20261123000100_restrict_public_truncate.sql', import.meta.url), 'utf8')
  await db.exec(`
    grant truncate on public.turno to public, anon, authenticated;
    create role tenant_truncate_legacy;
    grant tenant_truncate_legacy to authenticated;
    grant truncate on public.turno to tenant_truncate_legacy;
  `)
  await assert.rejects(() => db.exec(migration), /Persisten privilegios efectivos TRUNCATE/)
  await db.exec('rollback; revoke tenant_truncate_legacy from authenticated;')
  await db.exec(migration)

  const { rows: [grants] } = await db.query(`
    select has_table_privilege('anon','public.turno','TRUNCATE') as anon_truncate,
           has_table_privilege('authenticated','public.turno','TRUNCATE') as auth_truncate,
           has_column_privilege('authenticated','public.turno','estado','UPDATE') as auth_update
  `)
  assert.deepEqual(grants, { anon_truncate: false, auth_truncate: false, auth_update: true })
})

const commercial = new URL('../supabase/migrations/20261123000200_commercial_subscriptions.sql', import.meta.url)

async function commercialDatabase(t) {
  const db = await database()
  t.after(() => db.close())
  await db.exec(await readFile(commercial, 'utf8'))
  return db
}

test('prueba de 14 días, límites, aislamiento y agenda conservada al vencer', async (t) => {
  const db = await commercialDatabase(t)
  const { owner, negocio, otherNegocio, servicio, staff } = await seed(db)
  const { rows: [trial] } = await db.query(`
    select e.*, extract(epoch from s.trial_end-n.created_at) as duration
    from turnly_private.commercial_effective($1) e
    join turnly_private.commercial_subscription s on s.business_id=$1
    join public.negocio n on n.id=$1
  `, [negocio])
  assert.equal(trial.state, 'trialing')
  assert.equal(trial.advanced, true)
  assert.deepEqual([trial.staff_limit, trial.service_limit, Number(trial.duration)], [5, 10, 14 * 86400])
  await db.query("insert into public.staff(negocio_id,nombre) select $1,'Prueba '||i from generate_series(1,4) i", [negocio])
  await assert.rejects(db.query("insert into public.staff(negocio_id,nombre) values ($1,'Excedente')", [negocio]), /Límite de profesionales/)
  await db.query("insert into public.servicio(negocio_id,nombre,precio,duracion) select $1,'Prueba '||i,100,30 from generate_series(1,9) i", [negocio])
  await assert.rejects(db.query("insert into public.servicio(negocio_id,nombre,precio,duracion) values ($1,'Excedente',100,30)", [negocio]), /Límite de servicios/)
  const { rows: [booking] } = await db.query(`select * from public.turnly_book_with_policy($1,$2,$3,$4,'10:00',null,'Prueba','1123456789','example@example.test',false)`,
    [negocio, servicio, staff, tomorrow()])
  await db.query("update turnly_private.commercial_subscription set trial_end=statement_timestamp() where business_id=$1", [negocio])
  await assert.rejects(db.query(`select * from public.turnly_book_with_policy($1,$2,$3,$4,'12:00',null,'Prueba','1123456789','example@example.test',false)`,
    [negocio, servicio, staff, tomorrow()]), /Suscripción vencida/)
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  const { rows: [summary] } = await db.query('select public.turnly_commercial_summary() as subscription')
  assert.equal(summary.subscription.state, 'expired')
  assert.equal(summary.subscription.usage.staff, 5)
  assert.equal((await db.query('select id from public.turno where id=$1', [booking.turno_id])).rows.length, 1)
  await assert.rejects(db.query('select public.turnly_commercial_summary($1)', [otherNegocio]), /Acceso denegado/)
  await assert.rejects(db.query("select public.turnly_commercial_record_payment('i','s','p','approved',1,'ARS')"), /permission denied/)
  await assert.rejects(db.query("update public.negocio set suscripcion_tipo='pro' where id=$1", [negocio]), /permission denied/)
  await db.exec('reset role')
  assert.equal((await db.query('select public.turnly_cancel_public_booking($1,$2) ok', [booking.turno_id, booking.manage_token])).rows[0].ok, true)
  const { rows: [duplicate] } = await db.query("insert into public.negocio(owner_id,nombre,slug) values ($1,'Otra prueba','otra-prueba') returning id", [owner])
  assert.equal((await db.query('select state from turnly_private.commercial_effective($1)', [duplicate.id])).rows[0].state, 'expired')
})

test('facturas conciliadas, renovación, cambio de plan y cancelación auditada', async (t) => {
  const db = await commercialDatabase(t)
  const { owner, negocio } = await seed(db)
  await db.exec("insert into turnly_private.commercial_price values ('basico',10,'ARS'),('pro',20,'ARS')")
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  const change = (plan) => db.query("select public.turnly_commercial_request('change_plan',$1)", [plan])
  const stage = (invoice, offset) => db.query(`
    with boundary as (select (current_date+$3::interval)::timestamp as starts)
    select public.turnly_commercial_stage_invoice($1,'provider-sub',$2,starts at time zone 'UTC',
      (starts+interval '1 month') at time zone 'UTC') from boundary
  `, [negocio, invoice, offset])
  const pay = async (invoice, payment, status, amount, currency = 'ARS', sub = 'provider-sub') =>
    (await db.query('select public.turnly_commercial_record_payment($1,$2,$3,$4,$5,$6) as ok',
      [invoice, sub, payment, status, amount, currency])).rows[0].ok
  const effective = async () => (await db.query('select * from turnly_private.commercial_effective($1)', [negocio])).rows[0]
  await change('pro')
  await stage('first','-2 months')
  assert.equal(await pay('first','p1','approved',20), false) // El período ya venció.
  await stage('second','-2 days')
  assert.equal(await pay('second','p2','pending',20), true)
  assert.equal((await effective()).effective_plan, 'trial')
  assert.equal(await pay('second','p2','rejected',20), true)
  assert.equal(await pay('second','p3','approved',10), false)
  assert.equal(await pay('second','p3','approved',20,'USD'), false)
  assert.equal(await pay('second','p3','approved',20,'ARS','wrong-subscription'), false)
  assert.equal(await pay('second','p3','approved',20), true)
  const { rows: [before] } = await db.query('select period_end from turnly_private.commercial_subscription where business_id=$1', [negocio])
  assert.equal(await pay('second','p3','approved',20), true)
  assert.equal(await pay('second','p4','approved',20), false)
  assert.deepEqual((await db.query('select period_end from turnly_private.commercial_subscription where business_id=$1', [negocio])).rows[0], before)
  assert.deepEqual([ (await effective()).effective_plan, (await effective()).staff_limit, (await effective()).service_limit ], ['pro',15,50])

  await db.query("insert into public.staff(negocio_id,nombre) select $1,'Pro '||i from generate_series(1,4) i", [negocio])
  await change('basico')
  // Simulate arriving at the next billing boundary, without manipulating the server clock.
  await db.query("update turnly_private.commercial_subscription set period_start=current_date-interval '1 month',period_end=current_date-interval '1 day' where business_id=$1", [negocio])
  assert.equal((await effective()).effective_plan, null)
  await stage('renewal','-1 day')
  assert.equal(await pay('renewal','p5','rejected',10), true)
  assert.equal((await effective()).state, 'past_due')
  assert.equal(await pay('renewal','p6','approved',10), true)
  assert.deepEqual([ (await effective()).effective_plan, (await effective()).staff_limit, (await effective()).service_limit ], ['basico',2,5])
  assert.equal((await db.query('select count(*)::int as n from public.staff where negocio_id=$1', [negocio])).rows[0].n, 5)
  await assert.rejects(db.query("insert into public.staff(negocio_id,nombre) values ($1,'Excedente')", [negocio]), /Límite de profesionales/)
  await assert.rejects(db.query("insert into public.gasto(negocio_id,concepto,monto,fecha) values ($1,'Caja',1,current_date)", [negocio]), /requiere Pro/)
  await change('pro')
  await db.query("update turnly_private.commercial_subscription set period_start=current_date-interval '1 month',period_end=current_date where business_id=$1", [negocio])
  await stage('upgrade','0 days')
  assert.equal(await pay('upgrade','p7','approved',20), true)
  assert.equal((await effective()).effective_plan, 'pro')
  assert.equal((await db.query("select count(*)::int n from turnly_private.commercial_payment where status='approved'")).rows[0].n, 3)
  await assert.rejects(db.query('select public.turnly_commercial_support($1,$2)', [negocio,'Incidencia']), /Acceso denegado/)
  await db.exec("select public.turnly_commercial_request('cancel_renewal')")
  assert.equal((await db.query("select public.turnly_commercial_confirm_cancellation($1,'provider-sub') ok", [negocio])).rows[0].ok, true)
  assert.equal((await effective()).state, 'canceled')
  assert.equal((await effective()).effective_plan, 'pro')
  await assert.rejects(stage('new','1 month'), /no admite/)
  assert.equal((await db.query("select count(*)::int n from turnly_private.commercial_audit where business_id=$1 and event='renewal_stopped'", [negocio])).rows[0].n, 1)
})

test('Mercado Pago recurrente simulado usa facturas verificadas y conserva historial al revertir un pago', async t => {
  const { subscriptionClient } = await import('../lib/server/mercadopago-saas.ts')
  const db = await commercialDatabase(t)
  await db.exec(await readFile(new URL('../supabase/migrations/20261123000300_mercadopago_saas_adapter.sql', import.meta.url), 'utf8'))
  const { owner, negocio, otherNegocio } = await seed(db)
  const rpc = async (name, args = {}) => {
    const entries = Object.entries(args)
    const sql = entries.map(([key], i) => key + '=>$' + (i + 1)).join(',')
    return (await db.query('select public.' + name + '(' + sql + ') val', entries.map(([,value]) => value))).rows[0].val
  }

  const provider = new Map()
  let createCalls = 0
  const client = subscriptionClient({ token:'TEST-fixture', secret:'fixture', application:'100', collector:'200', returnUrl:'https://qa.example.test/upgrade', sandbox:true }, rpc,
    async (url, request) => {
      assert.equal(new URL(url).origin, 'https://api.mercadopago.com')
      const path = new URL(url).pathname
      if (request.method === 'POST') {
        assert.equal(path, '/preapproval')
        createCalls++
        const payload = JSON.parse(request.body)
        assert.equal(payload.status,'pending')
        assert.equal(payload.auto_recurring.frequency_type,'months')
        const id = 'provider-' + createCalls
        const result = { ...payload, id, application_id:100, collector_id:200,
          init_point:'https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id='+id }
        provider.set(path+'/'+id,result)
        return Response.json(result)
      }
      const resource = provider.get(path)
      assert.ok(resource,path)
      if (request.method === 'PUT') resource.status = JSON.parse(request.body).status
      return Response.json(resource)
    })

  assert.equal((await client.start(owner,'payer@example.test','pro')).status,'price')
  await db.exec("insert into turnly_private.commercial_price values ('basico',10,'ARS'),('pro',20,'ARS')")
  assert.equal((await client.start(owner,'payer@example.test','pro')).status,'checkout')
  assert.equal((await client.start(owner,'payer@example.test','pro')).status,'checkout')
  assert.equal(createCalls,1)
  assert.equal((await client.start(owner,'payer@example.test','basico')).status,'open_mandate')

  const m = provider.get('/preapproval/provider-1')
  m.status='authorized'
  assert.equal(await client.process('subscription_preapproval','provider-1'),'done')
  const { rows:[{ today }] } = await db.query("select (current_date::timestamp at time zone 'UTC')::text today")
  const day = new Date(today).toISOString()
  const invoice = { id: 51,type:'scheduled',preapproval_id:m.id,external_reference:m.external_reference,
    currency_id:'ARS',transaction_amount:'20.00',debit_date:m.auto_recurring.start_date,payment:{id:61} }
  const payment = { id:61,collector_id:200,live_mode:false,status:'approved',currency_id:'ARS',transaction_amount:20 }
  provider.set('/authorized_payments/51',invoice)
  provider.set('/v1/payments/61',payment)
  assert.equal(await client.process('subscription_authorized_payment','51'),'pending') // Aprobación anticipada.
  assert.equal((await db.query('select effective_plan from turnly_private.commercial_effective($1)',[negocio])).rows[0].effective_plan,'trial')

  // Advance the fixture to the debit day without changing the PostgreSQL clock.
  await db.query("update turnly_private.saas_mandate set anchor=$1 where id=$2",[day,m.external_reference])
  await db.query("update turnly_private.commercial_invoice set starts_at=$1,ends_at=(($1::timestamptz at time zone 'UTC')+interval '1 month') at time zone 'UTC' where provider_invoice='51'",[day])
  invoice.debit_date=day
  payment.transaction_amount=21
  assert.equal(await client.process('subscription_authorized_payment','51'),'review')
  payment.transaction_amount=20; payment.currency_id='USD'
  assert.equal(await client.process('subscription_authorized_payment','51'),'review')
  payment.currency_id='ARS'; payment.live_mode=true
  assert.equal(await client.process('subscription_authorized_payment','51'),'review')
  payment.live_mode=false; invoice.external_reference=otherNegocio
  assert.equal(await client.process('subscription_authorized_payment','51'),'review')
  invoice.external_reference=m.external_reference
  invoice.debit_date=new Date(Date.now()+86_400_000).toISOString()
  assert.equal(await client.process('subscription_authorized_payment','51'),'review')
  invoice.debit_date=day
  payment.status='pending'
  assert.equal(await client.process('subscription_authorized_payment','51'),'pending')
  payment.status='rejected'
  assert.equal(await client.process('subscription_authorized_payment','51'),'done')
  payment.status='approved'
  assert.equal(await client.process('subscription_authorized_payment','51'),'done')
  assert.equal(await client.process('subscription_authorized_payment','51'),'done')
  const effective = async () => (await db.query('select effective_plan from turnly_private.commercial_effective($1)',[negocio])).rows[0].effective_plan
  assert.equal(await effective(),'pro')
  assert.equal((await db.query("select count(*)::int n from turnly_private.commercial_audit where event='payment_approved'")).rows[0].n,1)

  const rev = await rpc('turnly_saas_enqueue',{event_topic:'payment',resource:'61'})
  const next = await rpc('turnly_saas_enqueue',{event_topic:'payment',resource:'61'})
  await rpc('turnly_saas_finish',{event_topic:'payment',resource:'61',generation:rev,result:'done'})
  assert.equal((await rpc('turnly_saas_pending'))[0].revision,next)

  // Roll the fixture's paid window forward to a renewal boundary.
  await db.query(`update turnly_private.commercial_subscription
    set period_start=($1::timestamptz-interval '1 month'), period_end=$1 where business_id=$2`,[day,negocio])
  const renewal = { ...invoice, id:52, payment:{id:62} }
  const renewalPayment = { ...payment, id:62 }
  provider.set('/authorized_payments/52',renewal)
  provider.set('/v1/payments/62',renewalPayment)
  const pastDebit = new Date(new Date(day).getTime() - 31 * 86400000).toISOString()
  await db.query("update turnly_private.commercial_invoice set starts_at=$1,ends_at=$2 where provider_invoice='51'",[pastDebit,day])
  invoice.debit_date=pastDebit
  assert.equal(await client.process('subscription_authorized_payment','52'),'done')
  assert.equal(await effective(),'pro')
  assert.equal(await client.cancelOwner(owner),'canceled')
  assert.equal(await effective(),'pro')
  payment.status='charged_back'
  assert.equal(await client.process('payment','61'),'done')
  assert.equal(await effective(),'pro') // Un período posterior ya pagado sigue vigente.
  renewalPayment.status='refunded'
  assert.equal(await client.process('payment','62'),'done')
  renewalPayment.status='approved'
  assert.equal(await client.process('payment','62'),'done')
  assert.equal(await effective(),null)
  assert.equal((await db.query("select status from turnly_private.commercial_payment where payment_id='62'")).rows[0].status,'refunded')
  assert.equal((await client.start(owner,'payer@example.test','basico')).status,'paid_period')
  await db.query("update turnly_private.commercial_subscription set period_start=current_date-interval '1 month',period_end=current_date where business_id=$1",[negocio])
  assert.equal((await client.start(owner,'payer@example.test','basico')).status,'checkout')
  assert.equal(createCalls,2)
  assert.equal(provider.get('/preapproval/provider-2').auto_recurring.transaction_amount,10)
})

test('privacidad registra una solicitud por tipo y aísla la revisión', async t => {
  const db = await commercialDatabase(t)
  await db.exec(await readFile(new URL('../supabase/migrations/20261123000400_privacy_requests.sql', import.meta.url), 'utf8'))
  const { owner } = await seed(db)
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
  const read = async () => (await db.query("select public.turnly_privacy_request('deletion') as requests")).rows[0].requests
  const requests = await read()
  assert.equal(requests.length,1)
  assert.equal((await read())[0].id,requests[0].id)
  await assert.rejects(db.query('select public.turnly_privacy_support()'),/Acceso denegado/)
  await assert.rejects(db.query('select * from turnly_private.privacy_request'),/permission denied/)
  await db.exec('reset role')
  assert.equal((await db.query('select count(*)::int n from turnly_private.privacy_request_audit')).rows[0].n,1)
})

test('directorio administrativo exige rol y filtra sin devolver correos', async t => {
  const db = await commercialDatabase(t)
  await db.exec(await readFile(new URL('../supabase/migrations/20261123000500_superadmin_directory.sql', import.meta.url), 'utf8'))
  const { owner, negocio } = await seed(db)
  const support = '10000000-0000-4000-8000-000000000010'
  await db.query("update auth.users set email='titular@example.test' where id=$1", [owner])
  await db.query('insert into auth.users(id) values($1)', [support])
  await db.query("insert into public.adminrol(user_id,role) values($1,'superadmin')", [support])
  await db.exec('set role authenticated')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
  await assert.rejects(db.query('select public.turnly_superadmin_directory()'), /Acceso denegado/)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [support])
  const { rows: [{ directory }] } = await db.query("select public.turnly_superadmin_directory('titular@example.test','trialing',true,0) directory")
  assert.equal(directory.rows.length, 1)
  assert.equal(directory.rows[0].id, negocio)
  assert.doesNotMatch(JSON.stringify(directory), /@example/)
})
