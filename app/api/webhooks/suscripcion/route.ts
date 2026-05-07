import {
  obtenerPagoMercadoPago,
  procesarPagoSuscripcion,
  verificarFirmaMercadoPago,
  type MercadoPagoWebhookPayload,
} from '@/lib/webhooks/mercadopago-handler'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const bodyText = await req.text()

    if (!verificarFirmaMercadoPago(req.headers)) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = JSON.parse(bodyText) as MercadoPagoWebhookPayload

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) {
      return NextResponse.json({ ok: true })
    }

    const pago = await obtenerPagoMercadoPago(paymentId)
    if (!pago) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    const externalReference = pago.external_reference
    const status = pago.status

    if (!externalReference || !status) {
      return NextResponse.json({ ok: true })
    }

    const [negocioId, tipoPlan = 'pro'] = externalReference.split('|')

    if (!negocioId) {
      return NextResponse.json({ ok: true })
    }

    await procesarPagoSuscripcion(
      supabaseAdmin,
      paymentId,
      status,
      negocioId,
      tipoPlan
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Turnly] Webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly webhook activo' })
}
