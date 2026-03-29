import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const plan = (body.plan ?? 'pro') as 'basico' | 'pro'

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
            catch { }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Leer precio desde la DB (configurable por superadmin)
    const { data: configs } = await supabase
      .from('config').select('clave, valor')
      .in('clave', ['precio_basico', 'precio_pro'])

    const precioMap: Record<string, number> = {}
    configs?.forEach(c => { precioMap[c.clave] = Number(c.valor) })
    const precio = plan === 'pro'
      ? (precioMap.precio_pro ?? 25000)
      : (precioMap.precio_basico ?? 5000)

    // Buscar negocio
    let neg = null
    const { data: byOwner } = await supabase.from('negocio').select('id, nombre, slug').eq('owner_id', user.id).single()
    if (byOwner) neg = byOwner
    else {
      const { data: byId } = await supabase.from('negocio').select('id, nombre, slug').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      neg = byId
    }
    if (!neg) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const planNombre = plan === 'pro' ? 'Pro' : 'Basico'

    const mpBody = {
      items: [{
        title: 'Turnly ' + planNombre + ' — 1 mes',
        description: 'Plan ' + planNombre + ' para ' + neg.nombre,
        quantity: 1,
        unit_price: precio,
        currency_id: 'ARS',
      }],
      payer: { email: user.email },
      external_reference: neg.id + '|' + plan,
      back_urls: {
        success: origin + '/upgrade?suscripcion=ok',
        failure: origin + '/upgrade?suscripcion=error',
        pending: origin + '/upgrade?suscripcion=pendiente',
      },
      auto_return: 'approved',
      notification_url: origin + '/api/webhooks/suscripcion',
      statement_descriptor: 'TURNLY',
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify(mpBody),
    })

    if (!mpRes.ok) throw new Error('MP error: ' + await mpRes.text())
    const preferencia = await mpRes.json()

    await supabase.from('suscripcion').insert({
      negocio_id: neg.id, plan, estado: 'pendiente',
      mp_preference_id: preferencia.id, monto: precio,
    })

    return NextResponse.json({
      url: process.env.NODE_ENV === 'production'
        ? preferencia.init_point
        : preferencia.sandbox_init_point,
    })
  } catch (err) {
    console.error('[Turnly] Error suscripcion:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
