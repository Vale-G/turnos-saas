import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSignedOAuthState,
  decryptCredentialValue,
  encryptCredentialValue,
  readSignedOAuthState,
} from '../lib/mercadopago-oauth-crypto.mjs'

const encryptionKey = Buffer.alloc(32, 7).toString('base64')
const stateSecret = 'turnly-test-secret-with-more-than-32-characters'
const negocioId = '10000000-0000-4000-8000-000000000001'
const userId = '20000000-0000-4000-8000-000000000002'

test('cifra y descifra credenciales sin conservar el token en claro', () => {
  const token = 'APP_USR-secret-business-token'
  const encrypted = encryptCredentialValue(token, encryptionKey, Buffer.alloc(12, 3))
  assert.doesNotMatch(encrypted, /secret-business-token/)
  assert.equal(decryptCredentialValue(encrypted, encryptionKey), token)
})

test('rechaza una credencial cifrada alterada', () => {
  const encrypted = encryptCredentialValue('TEST-secret-token', encryptionKey, Buffer.alloc(12, 4))
  const parts = encrypted.split('.')
  parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`
  assert.throws(() => decryptCredentialValue(parts.join('.'), encryptionKey))
})

test('state OAuth queda ligado al negocio, usuario y ventana de diez minutos', () => {
  const now = Date.parse('2026-11-09T00:00:00Z')
  const generated = createSignedOAuthState(negocioId, userId, stateSecret, now)
  const value = readSignedOAuthState(generated.cookie, generated.state, stateSecret, now + 60_000)
  assert.equal(value?.negocioId, negocioId)
  assert.equal(value?.userId, userId)
  assert.match(generated.challenge, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(readSignedOAuthState(generated.cookie, 'otro-state', stateSecret, now), null)
  assert.equal(readSignedOAuthState(generated.cookie, generated.state, stateSecret, now + 11 * 60_000), null)
})

test('state OAuth alterado o firmado con otro secreto se rechaza', () => {
  const generated = createSignedOAuthState(negocioId, userId, stateSecret, 1_000)
  assert.equal(readSignedOAuthState(`${generated.cookie.slice(0, -1)}x`, generated.state, stateSecret, 2_000), null)
  assert.equal(readSignedOAuthState(generated.cookie, generated.state, `${stateSecret}-otro`, 2_000), null)
})
