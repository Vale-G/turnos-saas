import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    // Crear cliente adentro del handler — nunca en el módulo raíz
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
      .from('Turno')
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
