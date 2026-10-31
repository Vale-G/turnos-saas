import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'
import { obtenerPagoMercadoPago, verificarFirmaMercadoPago, type MercadoPagoWebhookPayload } from '@/lib/webhooks/mercadopago-handler'

export async function POST(request: NextRequest) {
  let body: MercadoPagoWebhookPayload
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const dataId = String(request.nextUrl.searchParams.get('data.id') ?? body.data?.id ?? '')
  if (!verificarFirmaMercadoPago(request.headers, dataId)) return NextResponse.json({ ok: false }, { status: 401 })
  if (body.type && body.type !== 'payment') return NextResponse.json({ ok: true })
  const payment = await obtenerPagoMercadoPago(dataId)
  const [negocioId, plan] = payment?.external_reference?.split('|') ?? []
  if (!payment || !validUuid(negocioId) || (plan !== 'basico' && plan !== 'pro') || !payment.status
      || !Number.isFinite(payment.transaction_amount) || !payment.currency_id) {
    return NextResponse.json({ ok: false }, { status: 422 })
  }
  const admin = createAdminClient()
  const { data: applied, error } = await admin.rpc('turnly_apply_subscription_payment', {
    p_event_key: `subscription:${dataId}:${payment.status}`,
    p_payment_id: String(payment.id ?? dataId), p_negocio_id: negocioId, p_plan: plan,
    p_status: payment.status, p_amount: payment.transaction_amount, p_currency: payment.currency_id,
  })
  if (error || applied !== true) return NextResponse.json({ ok: false }, { status: 422 })
  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ status: 'Turnly suscripciones webhook activo' }) }
