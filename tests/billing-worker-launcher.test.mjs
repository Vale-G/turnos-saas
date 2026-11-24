import assert from 'node:assert/strict'
import test from 'node:test'
import { run } from '../scripts/run-billing-worker.mjs'

const originValue = 'https://sandbox.example.test'
const secret = 'synthetic-secret'

test('invoca un POST autenticado y registra solo contadores', async () => {
  const counts = { processed: 2, failed: 0, review: 0, deferred: 1 }
  const logs = []
  const exit = await run({
    originValue, secret,
    output: { log: line => logs.push(JSON.parse(line)) },
    request: async (url, options) => {
      assert.equal(url.href, originValue + '/api/cron/billing')
      assert.equal(options.method, 'POST')
      assert.equal(options.headers.authorization, 'Bearer ' + secret)
      assert.equal(options.redirect, 'error')
      return Response.json({ ...counts, internal: 'omitido' })
    },
  })
  assert.equal(exit, 0)
  assert.deepEqual(logs, [counts])
})

test('informa errores HTTP sin copiar el cuerpo al registro', async () => {
  const errors = []
  const exit = await run({
    originValue, secret,
    output: { error: (...args) => errors.push(args) },
    request: async () => Response.json({ private: 'omitido' }, { status: 503 }),
  })
  assert.equal(exit, 1)
  assert.deepEqual(errors, [['Billing worker returned HTTP %d', 503]])
})

test('marca resultados de revisión y rechaza destinos inseguros', async () => {
  const exit = await run({
    originValue, secret,
    output: { log() {} },
    request: async () => Response.json({ processed: 1, failed: 0, review: 1, deferred: 0 }),
  })
  assert.equal(exit, 1)
  await assert.rejects(run({
    originValue: 'http://sandbox.example.test', secret,
    request: () => assert.fail('No debe enviar credenciales por HTTP'),
  }), /Invalid worker configuration/)
})
