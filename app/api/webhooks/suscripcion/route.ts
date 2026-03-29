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
  supabaseAdmin: ReturnType<typeof createClient>,
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
    const rate = consumeRateLimit(`webhook-subscription:${ip}`, 120, 60_000)
    if (!rate.ok) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

    if (process.env.NODE_ENV === 'production' && !verificarFirmaMP(req)) {
      console.warn('[Turnly] Webhook firma inválida rechazado')
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
    const registration = await registerWebhookEvent(supabaseAdmin, 'mercadopago_subscription', eventKey, body)
    if (!registration.ok) {
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    if (registration.duplicated) {
      return NextResponse.json({ ok: true, duplicated: true })
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN },
    })
    if (!mpRes.ok) return NextResponse.json({ ok: false }, { status: 500 })

    const pago = await mpRes.json()
    const ref = pago.external_reference
    const estado = pago.status

    if (!ref) return NextResponse.json({ ok: true })

    const parts = ref.split('|')
    const negocioId = parts[0]
    const tipo = parts[1] ?? 'pro'

    if (tipo === 'sena') {
      const turnoId = negocioId
      if (estado === 'approved') {
        await supabaseAdmin.from('turno')
          .update({ pago_estado: 'cobrado', estado: 'confirmado' })
          .eq('id', turnoId)
        console.log('[Turnly] Seña aprobada turno:', turnoId)
      }

      await supabaseAdmin
        .from('webhook_event')
        .update({ processed_at: new Date().toISOString() })
        .eq('provider', 'mercadopago_subscription')
        .eq('event_key', eventKey)

      return NextResponse.json({ ok: true })
    }

    if (estado === 'approved') {
      const planFinal = tipo === 'basico' ? 'basico' : 'pro'
      const vencimiento = new Date()
      vencimiento.setDate(vencimiento.getDate() + 31)

      await supabaseAdmin.from('negocio')
        .update({ suscripcion_tipo: planFinal })
        .eq('id', negocioId)

      await supabaseAdmin.from('suscripcion')
        .update({
          estado: 'activa',
          mp_payment_id: String(paymentId),
          fecha_pago: new Date().toISOString(),
          fecha_vencimiento: vencimiento.toISOString(),
        })
        .eq('negocio_id', negocioId)
        .eq('estado', 'pendiente')

      console.log('[Turnly] Plan', planFinal, 'activado negocio:', negocioId)
    } else if (estado === 'rejected' || estado === 'cancelled') {
      await supabaseAdmin.from('suscripcion')
        .update({ estado: 'fallida', mp_payment_id: String(paymentId) })
        .eq('negocio_id', negocioId)
        .eq('estado', 'pendiente')
    }

    await supabaseAdmin
      .from('webhook_event')
      .update({ processed_at: new Date().toISOString() })
      .eq('provider', 'mercadopago_subscription')
      .eq('event_key', eventKey)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Turnly] Webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly webhook activo' })
}
