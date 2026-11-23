import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { rateLimitByIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const rate = rateLimitByIp(request, { limit: 3, windowMs: 60_000 }, 'subscription')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  const body = await request.json().catch(() => ({}))
  const plan = body.plan
  if (plan !== 'basico' && plan !== 'pro') return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'Pagos de Turnly no configurados' }, { status: 503 })

  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const admin = createAdminClient()
  const [{ data: negocio }, { data: configs }] = await Promise.all([
    admin.from('negocio').select('id,nombre,slug,moneda').eq('owner_id', user.id).maybeSingle(),
    admin.from('config').select('clave,valor').in('clave', ['precio_basico', 'precio_pro']),
  ])
  if (!negocio) return NextResponse.json({ error: 'Negocio inexistente' }, { status: 404 })
  const prices = Object.fromEntries((configs ?? []).map((item) => [item.clave, Number(item.valor)]))
  const amount = plan === 'pro' ? (prices.precio_pro ?? 25000) : (prices.precio_basico ?? 5000)
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Precio de plan inválido' }, { status: 500 })

  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).origin
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      items: [{ title: `Turnly ${plan} — 1 mes`, quantity: 1, unit_price: amount, currency_id: negocio.moneda }],
      payer: { email: user.email }, external_reference: `${negocio.id}|${plan}`,
      back_urls: { success: `${origin}/upgrade?suscripcion=ok`, failure: `${origin}/upgrade?suscripcion=error`, pending: `${origin}/upgrade?suscripcion=pendiente` },
      auto_return: 'approved', notification_url: `${origin}/api/webhooks/suscripcion`, statement_descriptor: 'TURNLY',
    }),
  })
  if (!response.ok) return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 502 })
  const preference = await response.json()
  if (typeof preference.id !== 'string' || typeof preference.init_point !== 'string') return NextResponse.json({ error: 'Respuesta de pago inválida' }, { status: 502 })
  const { error } = await admin.from('suscripcion').insert({ negocio_id: negocio.id, plan, estado: 'pendiente', mp_preference_id: preference.id, monto: amount })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la suscripción' }, { status: 500 })
  const paymentUrl = token.startsWith('TEST-') && typeof preference.sandbox_init_point === 'string'
    ? preference.sandbox_init_point
    : preference.init_point
  return NextResponse.json({ url: paymentUrl })
}
