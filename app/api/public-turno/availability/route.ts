import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { consumeRateLimit } from '@/lib/rate-limit'
import { getClientIp, isAllowedOrigin } from '@/lib/request-security'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/

type AvailabilityPayload = {
  negocio_id: string
  staff_id: string
  fecha: string
}

function parsePayload(raw: unknown): { data?: AvailabilityPayload; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Payload inválido' }
  }

  const body = raw as Record<string, unknown>
  const payload: AvailabilityPayload = {
    negocio_id: String(body.negocio_id ?? ''),
    staff_id: String(body.staff_id ?? ''),
    fecha: String(body.fecha ?? ''),
  }

  if (!UUID_REGEX.test(payload.negocio_id) || !UUID_REGEX.test(payload.staff_id)) {
    return { error: 'IDs inválidos' }
  }

  if (!FECHA_REGEX.test(payload.fecha)) {
    return { error: 'Fecha inválida' }
  }

  return { data: payload }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rate = await consumeRateLimit(`public-availability:${ip}`, 60, 60_000)
    if (!rate.ok) {
      return NextResponse.json({ error: 'Demasiadas consultas. Probá en unos segundos.' }, { status: 429 })
    }

    if (process.env.NODE_ENV === 'production' && !isAllowedOrigin(req)) {
      return NextResponse.json({ error: 'Origen no autorizado' }, { status: 403 })
    }

    const parsed = parsePayload(await req.json())
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error ?? 'Payload inválido' }, { status: 400 })
    }

    const { negocio_id, staff_id, fecha } = parsed.data

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

    const { data, error } = await supabaseAdmin
      .from('turno')
      .select('hora, estado')
      .eq('negocio_id', negocio_id)
      .eq('staff_id', staff_id)
      .eq('fecha', fecha)
      .not('estado', 'eq', 'cancelado')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ocupados = Array.from(new Set((data ?? []).map(turno => turno.hora))).sort()

    return NextResponse.json({ fecha, staff_id, ocupados })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
