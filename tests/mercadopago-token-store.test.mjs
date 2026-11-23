import assert from 'node:assert/strict'
import { test } from 'node:test'
import { persistBusinessToken } from '../lib/mercadopago-token-store.mjs'

function clientWith({ upsertError = null, cleanupError = null } = {}) {
  const calls = []
  const client = {
    from(table) {
      calls.push(['from', table])
      if (table === 'mercadopago_connection') {
        return {
          async upsert(payload, options) {
            calls.push(['upsert', payload, options])
            return { error: upsertError }
          },
        }
      }
      return {
        update(payload) {
          calls.push(['update', payload])
          return {
            async eq(column, value) {
              calls.push(['eq', column, value])
              return { error: cleanupError }
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

test('guarda la credencial cifrada y elimina el token heredado', async () => {
  const { client, calls } = clientWith()
  await persistBusinessToken(client, 'negocio-1', { access_token_encrypted: 'ciphertext' })
  assert.deepEqual(calls.at(-2), ['update', { mp_access_token: null }])
  assert.deepEqual(calls.at(-1), ['eq', 'id', 'negocio-1'])
})

test('no informa éxito si falla la limpieza del token heredado', async () => {
  const { client } = clientWith({ cleanupError: { message: 'denied' } })
  await assert.rejects(
    persistBusinessToken(client, 'negocio-1', { access_token_encrypted: 'ciphertext' }),
    /no se pudo eliminar la credencial anterior/i,
  )
})

test('no intenta limpiar el token heredado si falla el guardado cifrado', async () => {
  const { client, calls } = clientWith({ upsertError: { message: 'unavailable' } })
  await assert.rejects(
    persistBusinessToken(client, 'negocio-1', { access_token_encrypted: 'ciphertext' }),
    /no se pudo guardar la conexión/i,
  )
  assert.equal(calls.some(([operation]) => operation === 'update'), false)
})
