import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type BodyPayload = {
  negocio_id: string
  servicio_id: string
  staff_id: string
  fecha_utc: string
  hora_utc: string
  cliente_id?: string | null
  cliente_nombre: string
  cliente_email?: string | null
  cliente_telefono?: string | null
}

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '')
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'No se pudo procesar la solicitud' },
        { status: 500 }
      )
    }

    const body = (await req.json()) as BodyPayload
    const supabaseAdmin = createClient(url, serviceKey)

    const telefono = normalizePhone(body.cliente_telefono)
    const email = (body.cliente_email || '').trim().toLowerCase()

    const { data: bloqueados, error: errLista } = await supabaseAdmin
      .from('lista_negra')
      .select('id, usuario_id, email, telefono')
      .eq('negocio_id', body.negocio_id)

    if (errLista) {
      return NextResponse.json(
        { error: 'No se pudo procesar la solicitud' },
        { status: 500 }
      )
    }

    const bloqueado = (bloqueados || []).some(
      (b: {
        usuario_id: string | null
        email: string | null
        telefono: string | null
      }) => {
        const telBloqueado = normalizePhone(b.telefono)
        const emailBloqueado = String(b.email || '').toLowerCase()
        return (
          (body.cliente_id && b.usuario_id === body.cliente_id) ||
          (telefono && telBloqueado && telefono === telBloqueado) ||
          (email && emailBloqueado && email === emailBloqueado)
        )
      }
    )

    if (bloqueado) {
      return NextResponse.json(
        {
          error:
            'No es posible agendar en este momento. Por favor, comunicate por WhatsApp',
        },
        { status: 403 }
      )
    }

    const { data: turno, error: errTurno } = await supabaseAdmin
      .from('turno')
      .insert({
        negocio_id: body.negocio_id,
        servicio_id: body.servicio_id,
        staff_id: body.staff_id,
        fecha: body.fecha_utc,
        hora: body.hora_utc,
        cliente_id: body.cliente_id || null,
        cliente_nombre: body.cliente_nombre,
        estado: 'pendiente',
      })
      .select('id')
      .single()

    if (errTurno || !turno) {
      return NextResponse.json(
        { error: 'No se pudo procesar la solicitud' },
        { status: 500 }
      )
    }

    return NextResponse.json({ turnoId: turno.id })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo procesar la solicitud' },
      { status: 500 }
    )
  }
}
