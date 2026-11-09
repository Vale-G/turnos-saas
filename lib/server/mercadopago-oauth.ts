import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createSignedOAuthState,
  decryptCredentialValue,
  encryptCredentialValue,
  readSignedOAuthState,
} from '@/lib/mercadopago-oauth-crypto.mjs'

const OAUTH_AUTHORIZE_URL = 'https://auth.mercadopago.com.ar/authorization'
const OAUTH_TOKEN_URL = 'https://api.mercadopago.com/oauth/token'

type MercadoPagoToken = {
  access_token: string
  refresh_token?: string
  public_key?: string
  user_id: number | string
  expires_in: number
  live_mode?: boolean
  scope?: string
  token_type?: string
}

type BusinessCredentialRow = {
  negocio_id: string
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: string
}

function encryptionKey() {
  const encoded = process.env.MP_CREDENTIALS_ENCRYPTION_KEY
  if (!encoded) throw new Error('Falta MP_CREDENTIALS_ENCRYPTION_KEY')
  return encoded
}

function stateSecret() {
  const value = process.env.MP_OAUTH_STATE_SECRET
  if (!value || value.length < 32) throw new Error('Falta MP_OAUTH_STATE_SECRET seguro')
  return value
}

export function encryptCredential(value: string) {
  return encryptCredentialValue(value, encryptionKey())
}

export function decryptCredential(value: string) {
  return decryptCredentialValue(value, encryptionKey())
}

export function createOAuthState(negocioId: string, userId: string, now = Date.now()) {
  return createSignedOAuthState(negocioId, userId, stateSecret(), now)
}

export function readOAuthState(cookie: string, suppliedState: string, now = Date.now()) {
  return readSignedOAuthState(cookie, suppliedState, stateSecret(), now)
}

function oauthConfig() {
  const clientId = process.env.MP_CLIENT_ID
  const clientSecret = process.env.MP_CLIENT_SECRET
  const redirectUri = process.env.MP_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Mercado Pago OAuth no está configurado')
  return { clientId, clientSecret, redirectUri }
}

export function createAuthorizationUrl(state: string, challenge: string) {
  const { clientId, redirectUri } = oauthConfig()
  const url = new URL(OAUTH_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function requestToken(body: Record<string, string>): Promise<MercadoPagoToken> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Mercado Pago OAuth rechazó la solicitud (${response.status})`)
  const token = await response.json() as Partial<MercadoPagoToken>
  if (!token.access_token || !token.user_id || !Number.isFinite(token.expires_in)) throw new Error('Respuesta OAuth inválida')
  return token as MercadoPagoToken
}

export async function exchangeAuthorizationCode(code: string, verifier: string) {
  const { clientId, clientSecret, redirectUri } = oauthConfig()
  return requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })
}

async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = oauthConfig()
  return requestToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
}

export async function storeBusinessToken(admin: SupabaseClient, negocioId: string, token: MercadoPagoToken) {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
  const payload: Record<string, unknown> = {
    negocio_id: negocioId,
    access_token_encrypted: encryptCredential(token.access_token),
    token_expires_at: expiresAt,
    mp_user_id: String(token.user_id),
    live_mode: Boolean(token.live_mode),
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (token.refresh_token) payload.refresh_token_encrypted = encryptCredential(token.refresh_token)
  const { error } = await admin.from('mercadopago_connection').upsert(payload, { onConflict: 'negocio_id' })
  if (error) throw new Error('No se pudo guardar la conexión de Mercado Pago')
  await admin.from('negocio').update({ mp_access_token: null }).eq('id', negocioId)
}

export async function getBusinessAccessToken(admin: SupabaseClient, negocioId: string) {
  const { data } = await admin.from('mercadopago_connection').select(
    'negocio_id,access_token_encrypted,refresh_token_encrypted,token_expires_at',
  ).eq('negocio_id', negocioId).maybeSingle<BusinessCredentialRow>()
  if (!data) {
    const { data: legacy } = await admin.from('negocio').select('mp_access_token').eq('id', negocioId).maybeSingle()
    return legacy?.mp_access_token || null
  }

  const accessToken = decryptCredential(data.access_token_encrypted)
  const expiresAt = new Date(data.token_expires_at).getTime()
  if (!expiresAt || expiresAt > Date.now() + 24 * 60 * 60_000) return accessToken
  if (!data.refresh_token_encrypted) return null

  const refreshed = await refreshAccessToken(decryptCredential(data.refresh_token_encrypted))
  await storeBusinessToken(admin, negocioId, refreshed)
  return refreshed.access_token
}
