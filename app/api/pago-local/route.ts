import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'
import { rateLimitByIp } from '@/lib/rate-limit'
import { getBusinessAccessToken } from '@/lib/server/mercadopago-oauth'

export async function POST(request: NextRequest) {
  const rate = rateLimitByIp(request, { limit: 5, windowMs: 60_000 }, 'local-payment')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  const body = await request.json().catch(() => ({}))
  if (!validUuid(body.turno_id)) return NextResponse.json({ error: 'Turno inválido' }, { status: 400 })

  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const admin = createAdminClient()
  const { data: turno } = await admin.from('turno').select('id,negocio_id,servicio_id').eq('id', body.turno_id).maybeSingle()
  if (!turno) return NextResponse.json({ error: 'Turno inexistente' }, { status: 404 })
  const [{ data: negocio }, { data: servicio }] = await Promise.all([
    admin.from('negocio').select('id,owner_id,nombre,moneda').eq('id', turno.negocio_id).maybeSingle(),
    admin.from('servicio').select('nombre,precio').eq('id', turno.servicio_id).maybeSingle(),
  ])
  if (!negocio || negocio.owner_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const accessToken = await getBusinessAccessToken(admin, negocio.id)
  if (!accessToken || !servicio) return NextResponse.json({ error: 'Mercado Pago no está configurado' }, { status: 409 })
  const amount = Number(servicio.precio)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 409 })

  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).origin
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      items: [{ title: servicio.nombre, quantity: 1, unit_price: amount, currency_id: negocio.moneda }],
      external_reference: `${turno.id}|local`, statement_descriptor: 'TURNLY LOCAL',
      notification_url: `${origin}/api/webhooks/mercadopago?negocio=${negocio.id}`,
    }),
  })
  if (!response.ok) return NextResponse.json({ error: 'No se pudo iniciar el cobro' }, { status: 502 })
  const preference = await response.json()
  if (typeof preference.init_point !== 'string') return NextResponse.json({ error: 'Respuesta de pago inválida' }, { status: 502 })
  const paymentUrl = accessToken.startsWith('TEST-') && typeof preference.sandbox_init_point === 'string'
    ? preference.sandbox_init_point
    : preference.init_point
  return NextResponse.json({ url: paymentUrl })
}
