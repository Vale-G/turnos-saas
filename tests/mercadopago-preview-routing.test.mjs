import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const connectRoute = new URL('../app/api/ajustes/mercadopago/connect/route.ts', import.meta.url)
const depositRoute = new URL('../app/api/sena/route.ts', import.meta.url)
const oauthServer = new URL('../lib/server/mercadopago-oauth.ts', import.meta.url)

test('OAuth vuelve al mismo origen del Preview cuando falta configuración', async () => {
  const source = await readFile(connectRoute, 'utf8')
  assert.match(source, /request\.nextUrl\.origin/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_SITE_URL/)
})

test('los retornos y webhooks de señas usan el dominio que inició el pago', async () => {
  const source = await readFile(depositRoute, 'utf8')
  assert.match(source, /const origin = request\.nextUrl\.origin/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_SITE_URL/)
})

test('OAuth solo se anuncia disponible con cifrado y state seguros', async () => {
  const source = await readFile(oauthServer, 'utf8')
  assert.match(source, /export function mercadoPagoOAuthAvailable/)
  assert.match(source, /stateSecret\(\)/)
  assert.match(source, /Buffer\.from\(encryptionKey\(\), 'base64'\)\.length !== 32/)
})
