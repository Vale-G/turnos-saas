import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { negocio_id, servicio_id, staff_id, fecha, hora, cliente_nombre } = body

    if (!negocio_id || !servicio_id || !staff_id || !fecha || !hora || !cliente_nombre) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const horaNormalizada = String(hora).length === 5 ? hora + ':00' : hora

    const { data: existente } = await supabaseAdmin
      .from('turno')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('fecha', fecha)
      .eq('hora', horaNormalizada)
      .not('estado', 'eq', 'cancelado')
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Ese horario ya fue reservado.' }, { status: 409 })
    }

    const { data, error } = await supabaseAdmin
      .from('turno')
      .insert({
        negocio_id,
        servicio_id,
        staff_id,
        fecha,
        hora: horaNormalizada,
        cliente_id: null,
        cliente_nombre,
        estado: 'pendiente',
        pago_estado: 'pendiente',
      })
      .select('id')
      .single()

    if (error || !data) {
      if (error?.message?.includes('ux_turno_staff_fecha_hora_activo')) {
        return NextResponse.json({ error: 'Ese horario ya fue reservado.' }, { status: 409 })
      }
      return NextResponse.json({ error: error?.message ?? 'No se pudo crear el turno' }, { status: 500 })
    }

    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('[Turnly] Guest turno error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
