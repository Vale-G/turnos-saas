import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

import { consumeRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-security'

function verificarFirmaMP(req: NextRequest): boolean {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  if (!xSignature || !xRequestId) return false

  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return false

  try {
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
    const ts = parts.ts
    const v1 = parts.v1
    if (!ts || !v1) return false

    const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`
    const hmac = createHmac('sha256', secret).update(manifest).digest('hex')
    return hmac === v1
  } catch {
    return false
  }
}

async function registerWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  provider: string,
  eventKey: string,
  payload: unknown
) {
  const { error } = await supabaseAdmin
    .from('webhook_event')
    .insert({ provider, event_key: eventKey, payload })

  if (!error) {
    return { ok: true, duplicated: false }
  }

  if (error.code === '23505') {
    return { ok: true, duplicated: true }
  }

  return { ok: false, duplicated: false }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = consumeRateLimit(`webhook-mp:${ip}`, 120, 60_000)
    if (!rate.ok) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    if (process.env.NODE_ENV === 'production' && !verificarFirmaMP(req)) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { type, data } = body
    if (type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const eventKey = req.headers.get('x-request-id') ?? `payment:${String(paymentId)}`
    const registration = await registerWebhookEvent(supabaseAdmin, 'mercadopago_payment', eventKey, body)
    if (!registration.ok) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    if (registration.duplicated) {
      return NextResponse.json({ ok: true, duplicated: true })
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    })
    if (!mpRes.ok) return NextResponse.json({ ok: false }, { status: 500 })

    const pago = await mpRes.json()
    const turnoId = pago.external_reference
    if (!turnoId) return NextResponse.json({ ok: true })

    const estadoTurno: Record<string, string> = {
      approved: 'confirmado',
      rejected: 'cancelado',
      pending: 'pendiente',
      in_process: 'pendiente',
    }

    await supabaseAdmin
      .from('turno')
      .update({ estado: estadoTurno[pago.status] ?? 'pendiente', pago_id: String(paymentId), pago_estado: pago.status })
      .eq('id', turnoId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('webhook_event')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'mercadopago_payment')
      .eq('event_key', eventKey)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook MP]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly MP Webhook activo' })
}
