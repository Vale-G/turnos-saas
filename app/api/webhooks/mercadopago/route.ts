import {
  obtenerPagoMercadoPago,
  procesarPagoTurno,
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

    const body = (await req.json()) as MercadoPagoWebhookPayload

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

    const turnoId = pago.external_reference
    const status = pago.status

    if (!turnoId || !status) {
      return NextResponse.json({ ok: true })
    }

    await procesarPagoTurno(supabaseAdmin, paymentId, status, turnoId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook MP]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly MP Webhook activo' })
}
