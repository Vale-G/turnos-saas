import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

function keyFromBase64(encoded) {
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('La clave de cifrado debe contener 32 bytes en base64')
  return key
}

export function encryptCredentialValue(value, encodedKey, iv = randomBytes(12)) {
  const cipher = createCipheriv('aes-256-gcm', keyFromBase64(encodedKey), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptCredentialValue(value, encodedKey) {
  const [version, ivText, tagText, encryptedText] = value.split('.')
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new Error('Credencial cifrada inválida')
  const decipher = createDecipheriv('aes-256-gcm', keyFromBase64(encodedKey), Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8')
}

function signature(payload, secret) {
  if (!secret || secret.length < 32) throw new Error('El secreto de estado debe tener al menos 32 caracteres')
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSignedOAuthState(negocioId, userId, secret, now = Date.now()) {
  const verifier = randomBytes(48).toString('base64url')
  const state = randomBytes(24).toString('base64url')
  const data = { negocioId, userId, state, verifier, expiresAt: now + 10 * 60_000 }
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return {
    cookie: `${payload}.${signature(payload, secret)}`,
    state,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
  }
}

export function readSignedOAuthState(cookie, suppliedState, secret, now = Date.now()) {
  const separator = cookie.lastIndexOf('.')
  if (separator < 1) return null
  const payload = cookie.slice(0, separator)
  const suppliedSignature = Buffer.from(cookie.slice(separator + 1))
  const expectedSignature = Buffer.from(signature(payload, secret))
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data.state !== suppliedState || data.expiresAt < now || data.expiresAt > now + 11 * 60_000) return null
    if (!/^[0-9a-f-]{36}$/i.test(data.negocioId) || !/^[0-9a-f-]{36}$/i.test(data.userId)) return null
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(data.verifier)) return null
    return data
  } catch {
    return null
  }
}
