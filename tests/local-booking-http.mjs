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

const database = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const path = new URL(req.url, origin).pathname
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
  assert.equal(bookingCalls, 0)
  console.log('HTTP local: 6/6 escenarios aprobados, sin invocar las RPC de escritura.')
} finally {
  database.close()
}
