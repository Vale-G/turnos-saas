// Run against a local Next.js build started with the synthetic loopback configuration in the release notes.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'

const origin = 'http://127.0.0.1:3100'
const negocioId = '20000000-0000-4000-8000-000000000001'
const staffId = '40000000-0000-4000-8000-000000000001'
const servicioId = '30000000-0000-4000-8000-000000000001'
const token = 'a'.repeat(64)
const fecha = '2026-12-02'
let mode = 'error'
let bookingCalls = 0
let historyCalls = 0
const ownerId = '10000000-0000-4000-8000-000000000001'
const otherCustomerId = '10000000-0000-4000-8000-000000000002'
const sessionCookie = access_token => 'sb-127-auth-token=base64-' + Buffer.from(JSON.stringify({
  access_token, refresh_token: 'synthetic-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
})).toString('base64url')

const database = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const path = new URL(req.url, origin).pathname
  if (path === '/auth/v1/user') {
    const account = { 'Bearer synthetic-customer': ownerId, 'Bearer synthetic-other': otherCustomerId }[req.headers.authorization]
    if (!account) { res.statusCode = 401; return res.end(JSON.stringify({ message: 'invalid session' })) }
    return res.end(JSON.stringify({ id: account, aud: 'authenticated', role: 'authenticated' }))
  }
  if (path === '/rest/v1/rpc/turnly_server_customer_history') {
    historyCalls++
    if (req.headers.authorization !== 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY) {
      res.statusCode = 403
      return res.end(JSON.stringify({ message: 'service role required' }))
    }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const args = JSON.parse(body)
      const own = args.customer_id === ownerId && (!args.booking_id || args.booking_id === negocioId)
      res.end(JSON.stringify(own ? [{ id: negocioId, fecha, hora: '10:30', estado: 'confirmado', negocio_nombre: 'Comercio de prueba', servicio_nombre: 'Servicio de prueba' }] : []))
    })
    return
  }
  if (path === '/rest/v1/config') {
    if (mode === 'disconnect') return req.socket.destroy()
    if (mode === 'error') {
      res.statusCode = 503
      return res.end(JSON.stringify({ message: 'synthetic outage' }))
    }
    return res.end(JSON.stringify(mode === 'invalid' ? { valor: '' } : { valor: '["1123456789"]' }))
  }
  if (path.includes('/rpc/')) bookingCalls++
  res.statusCode = 503
  res.end(JSON.stringify({ message: 'unexpected synthetic request' }))
})

await new Promise((resolve, reject) => {
  database.once('error', reject)
  database.listen(54321, '127.0.0.1', resolve)
})

try {
  async function send(path, method, payload, status, text) {
    const response = await fetch(origin + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    assert.equal(response.status, status)
    assert.match((await response.json()).error, text)
  }

  const data = { negocioId, staffId, servicioId, fecha, hora: '10:30', nombre: 'Cliente QA', telefono: '1123456789', email: 'test@example.com' }
  await send('/api/public/reservas', 'POST', { ...data, fecha: '2026-02-30' }, 400, /Revisá/)
  for (const failure of ['error', 'disconnect', 'invalid']) {
    mode = failure
    await send('/api/public/reservas', 'POST', data, 503, /No se pudo validar/)
  }
  mode = 'blocked'
  await send('/api/public/reservas', 'POST', data, 403, /no está disponible/)
  await send('/api/public/reservas/' + negocioId + '?token=' + token, 'PUT', null, 400, /inválidos/)
  await send('/api/suscripcion', 'POST', { plan: 'pro', amount: 1 }, 400, /inválida/)
  await send('/api/suscripcion', 'POST', { action: 'change_plan', plan: 'pro', amount: 1 }, 401, /Iniciá sesión/)
  await send('/api/webhooks/suscripcion', 'POST', { type: 'payment', data: { id: 42 } }, 503, /deshabilitada/)
  await send('/api/cron/billing', 'POST', {}, 401, /No autorizado/)
  const recovery = await fetch(origin + '/recuperar')
  assert.equal(recovery.status, 200)
  assert.match(await recovery.text(), /for="recovery-email"/)
  const reset = await fetch(origin + '/recuperar/restablecer')
  assert.equal(reset.status, 200)
  const resetForm = await reset.text()
  assert.match(resetForm, /for="new-password"/)
  assert.match(resetForm, /for="confirm-password"/)
  assert.equal(bookingCalls, 0)
  const redirectChecks = new Map([
    ['/agenda', '/turnos?vista=semana'],
    ['/mis-reservas', '/mis-turnos'],
    ['/legal/politica-de-privacidad', '/privacidad'],
    ['/legal/terminos-y-condiciones', '/terminos'],
    ['/dashboard/lista-negra', '/login'],
    ['/reserva/confirmada/' + negocioId + '?token=' + token, '/cancelar/' + negocioId + '?token=' + token],
  ])
  for (const [from, to] of redirectChecks) {
    const response = await fetch(origin + from, { redirect: 'manual' })
    assert.equal(response.status, 307, from)
    assert.equal(new URL(response.headers.get('location'), origin).href, origin + to, from)
  }

  const retired = [
    ['/api/reservas/confirmar', 'POST'], ['/api/reserva/confirmacion', 'POST'],
    ['/api/email/confirmacion', 'POST'], ['/api/cron/send-reminders', 'GET'],
    ['/api/cron/recordatorios', 'GET'], ['/api/suscripcion/webhook', 'POST'],
    ['/api/suscripcion/checkout', 'POST'],
  ]
  for (const [path, method] of retired) {
    const response = await fetch(origin + path, { method })
    assert.equal(response.status, 404, path)
  }
  const legacyReceipt = await fetch(origin + '/reserva/confirmada/' + negocioId)
  assert.match(await legacyReceipt.text(), /Ingresá a tu cuenta o abrí el enlace de gestión/)
  assert.equal((await fetch(origin + '/api/customer/reservations')).status, 401)
  const headers = { cookie: sessionCookie('synthetic-customer') }
  const history = await fetch(origin + '/api/customer/reservations?customer_id=' + otherCustomerId, { headers })
  assert.equal(history.status, 200)
  assert.equal((await history.json()).reservations[0].id, negocioId)
  const other = { cookie: sessionCookie('synthetic-other') }
  const foreign = await fetch(origin + '/api/customer/reservations?customer_id=' + ownerId, { headers: other })
  assert.deepEqual(await foreign.json(), { reservations: [] })
  const receipt = await fetch(origin + '/reserva/confirmada/' + negocioId, { headers })
  assert.equal(receipt.status, 200)
  assert.match(await receipt.text(), /Comercio de prueba/)
  assert.equal((await fetch(origin + '/reserva/confirmada/' + negocioId, { headers: other })).status, 404)
  assert.equal(historyCalls, 4)
  assert.equal(bookingCalls, 0)
  console.log('HTTP local: escenarios anteriores y 5 controles nuevos de sesión, historial y comprobante aprobados. El fixture no recibió RPC de escritura.')
} finally {
  database.close()
}
