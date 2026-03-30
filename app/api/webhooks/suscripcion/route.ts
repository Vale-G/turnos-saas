import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function verificarFirmaMP(req: NextRequest, body: string): boolean {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')

  if (!xSignature || !xRequestId) {
    console.warn('[MP Webhook] Headers de firma faltantes')
    return process.env.NODE_ENV !== 'production'
  }

  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error('[MP Webhook] MP_WEBHOOK_SECRET no configurado')
    return false
  }

  try {
    const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
    const ts = parts['ts']
    const v1 = parts['v1']
    if (!ts || !v1) return false

    const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`
    const hmac = createHmac('sha256', secret).update(manifest).digest('hex')
    const valido = hmac === v1
    if (!valido) console.warn('[Turnly] Webhook firma inválida rechazado')
    return valido
  } catch (err) {
    console.error('[MP Webhook] Error verificando firma:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const bodyText = await req.text()

    if (!verificarFirmaMP(req, bodyText)) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = JSON.parse(bodyText)
    const { type, data } = body

    if (type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

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
          .update({ sena_pagada: true, estado: 'confirmado' })
          .eq('id', turnoId)
      }
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Turnly] Webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Turnly webhook activo' })
}
