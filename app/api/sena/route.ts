import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'
import { getBusinessAccessToken } from '@/lib/server/mercadopago-oauth'
import { hasProAccess } from '@/lib/server/plan-access'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByIp(request, { limit: 5, windowMs: 60_000 }, 'deposit')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }
  const turnoId = body.turno_id
  const manageToken = body.manage_token
  if (!validUuid(turnoId) || typeof manageToken !== 'string' || !/^[0-9a-f]{64}$/.test(manageToken)) {
    return NextResponse.json({ error: 'Reserva inválida' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: authorized, error: tokenError } = await admin.rpc('turnly_verify_manage_token', {
    p_turno_id: turnoId,
    p_token: manageToken,
  })
  if (tokenError || authorized !== true) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })

  const { data: turno, error } = await admin
    .from('turno')
    .select('id,estado,cliente_email,negocio_id,servicio_id')
    .eq('id', turnoId)
    .maybeSingle()
  if (error || !turno || turno.estado === 'cancelado') return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })

  const [{ data: negocio }, { data: servicio }] = await Promise.all([
    admin.from('negocio').select('id,nombre,moneda,suscripcion_tipo,trial_hasta').eq('id', turno.negocio_id).maybeSingle(),
    // Supabase's select-string parser cannot type columns containing ñ individually.
    // This table contains only public service configuration, so selecting its row is safe.
    admin.from('servicio').select('*').eq('id', turno.servicio_id).maybeSingle(),
  ])
  if (!negocio || !hasProAccess(negocio)) {
    return NextResponse.json({ error: 'El negocio no tiene habilitado el cobro de señas' }, { status: 409 })
  }
  const accessToken = negocio ? await getBusinessAccessToken(admin, negocio.id) : null
  if (!negocio || !accessToken || !servicio) {
    return NextResponse.json({ error: 'El negocio no tiene señas configuradas' }, { status: 409 })
  }

  const precio = Number(servicio.precio)
  const valor = Number(servicio.seña_valor)
  const monto = servicio.seña_tipo === 'fijo'
    ? Math.min(precio, valor)
    : servicio.seña_tipo === 'porcentaje'
      ? Math.round(precio * Math.min(100, Math.max(0, valor)) / 100 * 100) / 100
      : 0
  if (!Number.isFinite(monto) || monto <= 0 || monto > precio) {
    return NextResponse.json({ error: 'La seña no está configurada correctamente' }, { status: 409 })
  }

  // El origen de la solicitud es el mismo dominio estable donde vive la cookie OAuth.
  // Evita que un Preview genere retornos o webhooks hacia producción por una variable heredada.
  const origin = request.nextUrl.origin
  const preferenceResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      items: [{
        title: `Seña — ${servicio.nombre}`,
        description: `Seña para turno en ${negocio.nombre}`,
        quantity: 1,
        unit_price: monto,
        currency_id: negocio.moneda,
      }],
      payer: { email: turno.cliente_email },
      external_reference: `${turnoId}|sena`,
      back_urls: {
        success: `${origin}/reservar/sena-ok?turno=${turnoId}`,
        failure: `${origin}/reservar/sena-error?turno=${turnoId}`,
        pending: `${origin}/reservar/sena-pendiente?turno=${turnoId}`,
      },
      auto_return: 'approved',
      notification_url: `${origin}/api/webhooks/mercadopago?negocio=${negocio.id}`,
      statement_descriptor: 'TURNLY SENA',
    }),
  })
  if (!preferenceResponse.ok) {
    console.error('[Turnly] Mercado Pago rechazó la preferencia de seña', preferenceResponse.status)
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
  }
  const preference = await preferenceResponse.json()
  if (typeof preference.id !== 'string' || typeof preference.init_point !== 'string') {
    return NextResponse.json({ error: 'Respuesta de pago inválida' }, { status: 502 })
  }

  const { error: updateError } = await admin.from('turno').update({
    mp_preference_id: preference.id,
    requiere_sena: true,
    monto_sena: monto,
  }).eq('id', turnoId)
  if (updateError) return NextResponse.json({ error: 'No se pudo registrar la preferencia' }, { status: 500 })

  const paymentUrl = accessToken.startsWith('TEST-') && typeof preference.sandbox_init_point === 'string'
    ? preference.sandbox_init_point
    : preference.init_point
  return NextResponse.json({ url: paymentUrl }, { headers: { 'Cache-Control': 'no-store' } })
}
