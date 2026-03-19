import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { type, data } = body

    if (type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    // Consultar el pago a MP
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, {
      headers: { Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN },
    })
    if (!mpRes.ok) return NextResponse.json({ ok: false }, { status: 500 })

    const pago = await mpRes.json()
    const negocioId = pago.external_reference
    const estado = pago.status

    if (!negocioId) return NextResponse.json({ ok: true })

    if (estado === 'approved') {
      // Calcular vencimiento: 31 días desde ahora
      const vencimiento = new Date()
      vencimiento.setDate(vencimiento.getDate() + 31)

      // Activar plan Pro en el negocio
      await supabaseAdmin
        .from('Negocio')
        .update({ suscripcion_tipo: 'pro' })
        .eq('id', negocioId)

      // Actualizar suscripcion
      await supabaseAdmin
        .from('Suscripcion')
        .update({
          estado: 'activa',
          mp_payment_id: String(paymentId),
          fecha_pago: new Date().toISOString(),
          fecha_vencimiento: vencimiento.toISOString(),
        })
        .eq('negocio_id', negocioId)
        .eq('estado', 'pendiente')

      console.log('[Turnly] Plan Pro activado para negocio:', negocioId)
    } else if (estado === 'rejected' || estado === 'cancelled') {
      await supabaseAdmin
        .from('Suscripcion')
        .update({ estado: 'fallida', mp_payment_id: String(paymentId) })
        .eq('negocio_id', negocioId)
        .eq('estado', 'pendiente')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Turnly] Webhook suscripcion error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly suscripcion webhook activo' })
}
