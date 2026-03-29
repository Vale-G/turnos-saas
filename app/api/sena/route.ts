import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { turno_id, monto_sena, servicio_nombre, negocio_nombre } = body

    if (!turno_id || !monto_sena) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

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

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const mpBody = {
      items: [{
        title: 'Seña — ' + servicio_nombre,
        description: 'Seña para turno en ' + negocio_nombre,
        quantity: 1,
        unit_price: monto_sena,
        currency_id: 'ARS',
      }],
      payer: { email: user.email },
      external_reference: turno_id + '|sena',
      back_urls: {
        success: origin + '/reservar/sena-ok?turno=' + turno_id,
        failure: origin + '/reservar/sena-error?turno=' + turno_id,
        pending: origin + '/reservar/sena-pendiente?turno=' + turno_id,
      },
      auto_return: 'approved',
      notification_url: origin + '/api/webhooks/suscripcion',
      statement_descriptor: 'TURNLY SENA',
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

    // Guardar preference_id en el turno
    await supabase.from('turno')
      .update({ mp_preference_id: preferencia.id, requiere_sena: true, monto_sena })
      .eq('id', turno_id)

    return NextResponse.json({
      url: process.env.NODE_ENV === 'production'
        ? preferencia.init_point
        : preferencia.sandbox_init_point,
    })
  } catch (err) {
    console.error('[Turnly] Error seña:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
