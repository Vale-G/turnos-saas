import { NextRequest, NextResponse } from 'next/server'
import { cleanText, validDate, validHour, validUuid } from '@/lib/server/public-booking'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { rateLimitByIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByIp(request, { limit: 6, windowMs: 60_000 }, 'public-booking')
  if (!rate.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intentá nuevamente en un minuto.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const negocioId = body.negocioId
  const servicioId = body.servicioId
  const staffId = body.staffId
  const fecha = body.fecha
  const hora = body.hora
  const nombre = cleanText(body.nombre, 120)
  const telefono = cleanText(body.telefono, 30)
  const email = cleanText(body.email, 254).toLowerCase()
  if (!validUuid(negocioId) || !validUuid(servicioId) || !validUuid(staffId) || !validDate(fecha) || !validHour(hora)
      || nombre.length < 2 || !/^\+?[0-9 ()-]{6,30}$/.test(telefono) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Revisá los datos de contacto y del turno' }, { status: 400 })
  }

  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  const admin = createAdminClient()
  const { data: blacklistData, error: blacklistError } = await admin
    .from('config')
    .select('valor')
    .eq('clave', `blacklist_${negocioId}`)
    .maybeSingle()
  if (blacklistError) {
    return NextResponse.json({ error: 'No se pudo validar la reserva. Intentá nuevamente.' }, { status: 503 })
  }
  if (blacklistData?.valor) {
    let blacklist: unknown
    try {
      blacklist = JSON.parse(blacklistData.valor)
    } catch {
      return NextResponse.json({ error: 'No se pudo validar la reserva. Contactá al local.' }, { status: 503 })
    }
    if (!Array.isArray(blacklist) || !blacklist.every((item: unknown) => typeof item === 'string')) {
      return NextResponse.json({ error: 'No se pudo validar la reserva. Contactá al local.' }, { status: 503 })
    }
    const normalizedPhone = telefono.replace(/[^0-9]/g, '')
    if (blacklist.some((item: string) => item.replace(/[^0-9]/g, '') === normalizedPhone)) {
      return NextResponse.json({ error: 'Este servicio no está disponible para tu número. Contactá al local.' }, { status: 403 })
    }
  }
  const { data, error } = await admin.rpc('turnly_create_public_booking', {
    p_negocio_id: negocioId,
    p_servicio_id: servicioId,
    p_staff_id: staffId,
    p_fecha: fecha,
    p_hora: `${hora}:00`,
    p_cliente_id: user?.id ?? null,
    p_cliente_nombre: nombre,
    p_cliente_telefono: telefono,
    p_cliente_email: email,
  })

  if (error) {
    const conflict = error.code === '23P01' || /disponible|bloqueado/i.test(error.message)
    return NextResponse.json(
      { error: conflict ? 'Ese horario acaba de ocuparse. Elegí otro.' : 'No se pudo crear la reserva con esos datos.' },
      { status: conflict ? 409 : 400 },
    )
  }
  const result = Array.isArray(data) ? data[0] : data
  if (!result?.turno_id || !result?.manage_token) {
    return NextResponse.json({ error: 'No se pudo confirmar la reserva' }, { status: 500 })
  }

  return NextResponse.json(
    { id: result.turno_id, manageToken: result.manage_token },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
