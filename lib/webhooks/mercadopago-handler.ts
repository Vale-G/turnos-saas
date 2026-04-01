import { createHmac } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MercadoPagoWebhookPayload = {
  type?: string
  data?: {
    id?: string | number
  }
}

export type MercadoPagoPayment = {
  status?: string
  external_reference?: string
}

export function verificarFirmaMercadoPago(headers: Headers): boolean {
  const xSignature = headers.get('x-signature')
  const xRequestId = headers.get('x-request-id')

  if (!xSignature || !xRequestId) {
    return process.env.NODE_ENV !== 'production'
  }

  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    return false
  }

  try {
    const parts = Object.fromEntries(xSignature.split(',').map((p) => p.split('=')))
    const ts = parts.ts
    const v1 = parts.v1

    if (!ts || !v1) {
      return false
    }

    const manifest = `id:${xRequestId};request-id:${xRequestId};ts:${ts};`
    const hmac = createHmac('sha256', secret).update(manifest).digest('hex')

    return hmac === v1
  } catch {
    return false
  }
}

export async function obtenerPagoMercadoPago(paymentId: string | number): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN no configurado')
  }

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!mpRes.ok) {
    return null
  }

  return (await mpRes.json()) as MercadoPagoPayment
}

export async function procesarPagoTurno(
  supabaseAdmin: SupabaseClient,
  paymentId: string | number,
  status: string,
  turnoId: string,
): Promise<void> {
  const estadoTurno: Record<string, string> = {
    approved: 'confirmado',
    rejected: 'cancelado',
    pending: 'pendiente',
    in_process: 'pendiente',
  }

  await supabaseAdmin
    .from('turno')
    .update({
      estado: estadoTurno[status] ?? 'pendiente',
      pago_id: String(paymentId),
      pago_estado: status,
    })
    .eq('id', turnoId)
}

export async function procesarPagoSuscripcion(
  supabaseAdmin: SupabaseClient,
  paymentId: string | number,
  status: string,
  negocioId: string,
  tipoPlan: string,
): Promise<void> {
  if (tipoPlan === 'sena') {
    if (status === 'approved') {
      await supabaseAdmin
        .from('turno')
        .update({ sena_pagada: true, estado: 'confirmado' })
        .eq('id', negocioId)
    }
    return
  }

  if (status === 'approved') {
    const planFinal = tipoPlan === 'basico' ? 'basico' : 'pro'
    const vencimiento = new Date()
    vencimiento.setDate(vencimiento.getDate() + 31)

    await supabaseAdmin
      .from('negocio')
      .update({ suscripcion_tipo: planFinal })
      .eq('id', negocioId)

    await supabaseAdmin
      .from('suscripcion')
      .update({
        estado: 'activa',
        mp_payment_id: String(paymentId),
        fecha_pago: new Date().toISOString(),
        fecha_vencimiento: vencimiento.toISOString(),
      })
      .eq('negocio_id', negocioId)
      .eq('estado', 'pendiente')

    return
  }

  if (status === 'rejected' || status === 'cancelled') {
    await supabaseAdmin
      .from('suscripcion')
      .update({ estado: 'fallida', mp_payment_id: String(paymentId) })
      .eq('negocio_id', negocioId)
      .eq('estado', 'pendiente')
  }
}
