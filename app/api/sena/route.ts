import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { turno_id, monto_sena, servicio_nombre, negocio_nombre, cliente_email } = body

    if (!turno_id || !monto_sena) {
      return NextResponse.json({ error: 'Faltan datos requeridos (turno_id, monto_sena)' }, { status: 400 })
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

    // Buscamos a qué negocio pertenece el turno para obtener SU token de MercadoPago
    const { data: turnoData } = await supabase.from('turno').select('negocio_id').eq('id', turno_id).single()
    if (!turnoData) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    const { data: negocioData } = await supabase.from('negocio').select('mp_access_token').eq('id', turnoData.negocio_id).single()
    const ownerToken = negocioData?.mp_access_token

    if (!ownerToken) {
      return NextResponse.json({ error: 'El negocio no tiene configurado MercadoPago' }, { status: 400 })
    }

    const emailComprador = cliente_email || 'invitado@turnly.app'
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://turnly.app'

    const mpBody = {
      items: [{
        title: 'Seña — ' + servicio_nombre,
        description: 'Seña para turno en ' + negocio_nombre,
        quantity: 1,
        unit_price: monto_sena,
        currency_id: 'ARS',
      }],
      payer: { email: emailComprador },
      external_reference: turno_id + '|sena',
      back_urls: {
        success: origin + '/reservar/sena-ok?turno=' + turno_id,
        failure: origin + '/reservar/sena-error?turno=' + turno_id,
        pending: origin + '/reservar/sena-pendiente?turno=' + turno_id,
      },
      auto_return: 'approved',
      notification_url: origin + '/api/webhooks/sena',
      statement_descriptor: 'TURNLY SENA',
    }

    // USAMOS EL TOKEN DEL DUEÑO DEL LOCAL
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + ownerToken, 
      },
      body: JSON.stringify(mpBody),
    })

    if (!mpRes.ok) throw new Error('Error en MP: ' + await mpRes.text())
    const preferencia = await mpRes.json()

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
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 })
  }
}
