import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { consumeRateLimit } from '@/lib/rate-limit'
import { getClientIp, isAllowedOrigin } from '@/lib/request-security'

type PublicTurnoPayload = {
  negocio_id: string
  servicio_id: string
  staff_id: string
  fecha: string
  hora: string
  cliente_nombre: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/
const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

function parseAndValidatePayload(raw: unknown): { data?: PublicTurnoPayload; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Payload inválido' }
  }

  const body = raw as Record<string, unknown>
  const payload: PublicTurnoPayload = {
    negocio_id: String(body.negocio_id ?? ''),
    servicio_id: String(body.servicio_id ?? ''),
    staff_id: String(body.staff_id ?? ''),
    fecha: String(body.fecha ?? ''),
    hora: String(body.hora ?? ''),
    cliente_nombre: String(body.cliente_nombre ?? '').trim(),
  }

  if (!UUID_REGEX.test(payload.negocio_id) || !UUID_REGEX.test(payload.servicio_id) || !UUID_REGEX.test(payload.staff_id)) {
    return { error: 'IDs inválidos' }
  }

  if (!FECHA_REGEX.test(payload.fecha)) {
    return { error: 'Fecha inválida' }
  }

  if (!HORA_REGEX.test(payload.hora)) {
    return { error: 'Hora inválida' }
  }

  if (payload.cliente_nombre.length < 2 || payload.cliente_nombre.length > 120) {
    return { error: 'Nombre inválido' }
  }

  return { data: payload }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = consumeRateLimit(`public-turno:${ip}`, 20, 60_000)
    if (!rate.ok) {
      return NextResponse.json({ error: 'Demasiados intentos. Probá de nuevo en unos segundos.' }, { status: 429 })
    }

    if (process.env.NODE_ENV === 'production' && !isAllowedOrigin(req)) {
      return NextResponse.json({ error: 'Origen no autorizado' }, { status: 403 })
    }

    const parsed = parseAndValidatePayload(await req.json())
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error ?? 'Payload inválido' }, { status: 400 })
    }

    const { negocio_id, servicio_id, staff_id, fecha, hora, cliente_nombre } = parsed.data

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
