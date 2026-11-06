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

  const admin = createAdminClient()
  const negocioId = request.nextUrl.searchParams.get('negocio')
  let businessToken: string | undefined
  if (validUuid(negocioId)) {
    const { data: negocio } = await admin.from('negocio').select('mp_access_token').eq('id', negocioId).maybeSingle()
    businessToken = negocio?.mp_access_token ?? undefined
  }
  const payment = await obtenerPagoMercadoPago(dataId, businessToken)
  const [turnoId, suffix = 'full'] = payment?.external_reference?.split('|') ?? []
  const kind = suffix === 'sena' ? 'sena' : 'full'
  if (!payment || !validUuid(turnoId) || !payment.status || !Number.isFinite(payment.transaction_amount) || !payment.currency_id) {
    return NextResponse.json({ ok: false }, { status: 422 })
  }
  const { data: applied, error } = await admin.rpc('turnly_apply_booking_payment', {
    p_event_key: `payment:${dataId}:${payment.status}`,
    p_payment_id: String(payment.id ?? dataId), p_turno_id: turnoId, p_kind: kind,
    p_status: payment.status, p_amount: payment.transaction_amount, p_currency: payment.currency_id,
  })
  if (error || applied !== true) return NextResponse.json({ ok: false }, { status: 422 })
  return NextResponse.json({ ok: true })
}

export async function GET() { return NextResponse.json({ status: 'Turnly MP Webhook activo' }) }
