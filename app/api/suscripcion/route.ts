import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PRECIO_PRO_ARS = 15000

export async function POST(req: NextRequest) {
  try {
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

    // Buscar el negocio
    let neg = null
    const { data: byOwner } = await supabase.from('Negocio').select('id, nombre, slug').eq('owner_id', user.id).single()
    if (byOwner) neg = byOwner
    else {
      const { data: byId } = await supabase.from('Negocio').select('id, nombre, slug').eq('id', user.id).single()
      neg = byId
    }
    if (!neg) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    // Crear preferencia en MP
    const mpBody = {
      items: [{
        title: 'Turnly Pro — 1 mes',
        description: 'Plan Pro para ' + neg.nombre,
        quantity: 1,
        unit_price: PRECIO_PRO_ARS,
        currency_id: 'ARS',
      }],
      payer: { email: user.email },
      external_reference: neg.id,
      back_urls: {
        success: origin + '/dashboard?suscripcion=ok',
        failure: origin + '/dashboard?suscripcion=error',
        pending: origin + '/dashboard?suscripcion=pendiente',
      },
      auto_return: 'approved',
      notification_url: origin + '/api/webhooks/suscripcion',
      statement_descriptor: 'TURNLY PRO',
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.MP_ACCESS_TOKEN,
      },
      body: JSON.stringify(mpBody),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      throw new Error('MP error: ' + err)
    }

    const preferencia = await mpRes.json()

    // Guardar suscripcion pendiente
    await supabase.from('Suscripcion').insert({
      negocio_id: neg.id,
      plan: 'pro',
      estado: 'pendiente',
      mp_preference_id: preferencia.id,
      monto: PRECIO_PRO_ARS,
    })

    return NextResponse.json({
      url: process.env.NODE_ENV === 'production'
        ? preferencia.init_point
        : preferencia.sandbox_init_point,
      preferencia_id: preferencia.id,
    })
  } catch (err) {
    console.error('[Turnly] Error suscripcion:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
