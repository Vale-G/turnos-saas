import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

function verificarFirmaMP(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true

  const secret = process.env.MP_WEBHOOK_SECRET
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (!secret || !xSignature || !xRequestId) return false

  try {
    const parts = Object.fromEntries(
      xSignature
        .split(',')
        .map(p => p.trim())
        .map(p => p.split('='))
    )
    const ts = parts.ts
    const v1 = parts.v1
    if (!ts || !v1) return false

    const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`
    const digest = createHmac('sha256', secret).update(manifest).digest('hex')

    const a = Buffer.from(digest)
    const b = Buffer.from(v1)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (!verificarFirmaMP(req)) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = await req.json()
    const { type, data } = body
    if (type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook MP]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly MP Webhook activo' })
}
