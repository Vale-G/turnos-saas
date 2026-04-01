import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { turno_id, monto, concepto } = await req.json()

    if (!turno_id || !monto) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: turnoData, error: turnoError } = await supabase
      .from('turno')
      .select('id, negocio_id')
      .eq('id', turno_id)
      .single()

    if (turnoError || !turnoData) {
      return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })
    }

    const { data: negocioData, error: negocioError } = await supabase
      .from('negocio')
      .select('id, owner_id, mp_access_token')
      .eq('id', turnoData.negocio_id)
      .single()

    if (negocioError || !negocioData) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })
    }

    if (negocioData.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!negocioData.mp_access_token) {
      return NextResponse.json({ error: 'El negocio no tiene MercadoPago configurado' }, { status: 400 })
    }

    const mpBody = {
      items: [
        {
          title: concepto || 'Cobro en Local',
          quantity: 1,
          unit_price: Number(monto),
          currency_id: 'ARS',
        },
      ],
      external_reference: turno_id + '|local',
      auto_return: 'approved',
      statement_descriptor: 'TURNLY LOCAL',
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + negocioData.mp_access_token,
      },
      body: JSON.stringify(mpBody),
    })

    if (!mpRes.ok) {
      throw new Error('Error MP')
    }

    const preferencia = await mpRes.json()

    return NextResponse.json({ url: preferencia.init_point })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
