import { createHmac, timingSafeEqual } from 'node:crypto'

export type MercadoPagoWebhookPayload = { type?: string; data?: { id?: string | number } }
export type MercadoPagoPayment = {
  id?: string | number
  status?: string
  external_reference?: string
  transaction_amount?: number
  currency_id?: string
}

export function verificarFirmaMercadoPago(headers: Headers, dataId: string, now = Date.now()): boolean {
  const signature = headers.get('x-signature')
  const requestId = headers.get('x-request-id')
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!signature || !requestId || !secret || !dataId) return false
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=', 2)))
  const timestamp = parts.ts
  const supplied = parts.v1
  if (!/^\d{10,13}$/.test(timestamp ?? '') || !/^[0-9a-f]{64}$/i.test(supplied ?? '')) return false
  const millis = Number(timestamp) < 10_000_000_000 ? Number(timestamp) * 1000 : Number(timestamp)
  if (!Number.isFinite(millis) || Math.abs(now - millis) > 10 * 60_000) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`
  const expected = createHmac('sha256', secret).update(manifest).digest()
  const actual = Buffer.from(supplied, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function obtenerPagoMercadoPago(paymentId: string | number, accessToken?: string): Promise<MercadoPagoPayment | null> {
  const token = accessToken ?? process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('Mercado Pago no configurado')
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
}
