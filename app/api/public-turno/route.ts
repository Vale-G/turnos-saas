import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { negocio_id, servicio_id, staff_id, fecha, hora, cliente_nombre } = body ?? {}

    if (!negocio_id || !servicio_id || !staff_id || !fecha || !hora || !cliente_nombre) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: negocio } = await supabaseAdmin
      .from('negocio')
      .select('id, activo')
      .eq('id', negocio_id)
      .maybeSingle()
    if (!negocio || negocio.activo === false) {
      return NextResponse.json({ error: 'Negocio no disponible para reservas' }, { status: 400 })
    }

    const { data: existente } = await supabaseAdmin
      .from('turno')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('fecha', fecha)
      .eq('hora', hora)
      .not('estado', 'eq', 'cancelado')
      .limit(1)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ error: 'Ese horario acaba de ocuparse. Elegí otro horario disponible.' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin.from('turno').insert({
      negocio_id,
      servicio_id,
      staff_id,
      fecha,
      hora,
      cliente_id: null,
      cliente_nombre,
      estado: 'pendiente',
      pago_estado: 'pendiente',
    }).select('id').single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'No se pudo crear el turno' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
