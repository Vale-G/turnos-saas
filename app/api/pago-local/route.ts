import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { turno_id, monto, concepto } = await req.json()

    if (!turno_id || !monto) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    // Obtener token del negocio
    const { data: turnoData } = await supabase.from('turno').select('negocio_id').eq('id', turno_id).single()
    if (!turnoData) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 })

    const { data: negocioData } = await supabase.from('negocio').select('mp_access_token').eq('id', turnoData.negocio_id).single()
    if (!negocioData?.mp_access_token) return NextResponse.json({ error: 'El negocio no tiene MercadoPago configurado' }, { status: 400 })

    const mpBody = {
      items: [{ title: concepto || 'Cobro en Local', quantity: 1, unit_price: Number(monto), currency_id: 'ARS' }],
      external_reference: turno_id + '|local',
      auto_return: 'approved',
      statement_descriptor: 'TURNLY LOCAL',
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + negocioData.mp_access_token },
      body: JSON.stringify(mpBody),
    })

    if (!mpRes.ok) throw new Error('Error MP')
    const preferencia = await mpRes.json()

    return NextResponse.json({ url: preferencia.init_point })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
