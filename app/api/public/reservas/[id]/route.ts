import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server/supabase'
import { validDate, validHour, validUuid } from '@/lib/server/public-booking'
import { rateLimitByIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function tokenFrom(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  return token && /^[0-9a-f]{64}$/.test(token) ? token : null
}

async function authorize(id: string, token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('turnly_verify_manage_token', { p_turno_id: id, p_token: token })
  return { admin, authorized: !error && data === true }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const token = tokenFrom(request)
  if (!validUuid(id) || !token) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  const { admin, authorized } = await authorize(id, token)
  if (!authorized) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })

  const { data: turno } = await admin.from('turno')
    .select('id,cliente_nombre,fecha,hora,estado,negocio_id,servicio_id,staff_id')
    .eq('id', id).maybeSingle()
  if (!turno) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  const [{ data: negocio }, { data: servicio }, { data: staff }] = await Promise.all([
    admin.from('negocio').select('nombre,slug,logo_url,tema').eq('id', turno.negocio_id).maybeSingle(),
    admin.from('servicio').select('nombre').eq('id', turno.servicio_id).maybeSingle(),
    admin.from('staff').select('id,nombre').eq('negocio_id', turno.negocio_id).eq('activo', true).order('nombre'),
  ])
  if (!negocio || !servicio) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  return NextResponse.json({
    reserva: {
      id: turno.id, clienteNombre: turno.cliente_nombre, fecha: turno.fecha, hora: turno.hora,
      estado: turno.estado, servicio: servicio.nombre, negocioId: turno.negocio_id,
      servicioId: turno.servicio_id, staffId: turno.staff_id,
    },
    negocio,
    staff: staff ?? [],
  }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByIp(request, { limit: 5, windowMs: 60_000 }, 'reschedule-booking')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  const { id } = await context.params
  const token = tokenFrom(request)
  const body = await request.json().catch(() => ({}))
  if (!validUuid(id) || !token || !validDate(body.fecha) || !validHour(body.hora) || !validUuid(body.staffId)) {
    return NextResponse.json({ error: 'Datos de reprogramación inválidos' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('turnly_reschedule_public_booking', {
    p_turno_id: id, p_token: token, p_fecha: body.fecha, p_hora: `${body.hora}:00`, p_staff_id: body.staffId,
  })
  if (error || data !== true) {
    return NextResponse.json({ error: error?.message || 'El horario ya no está disponible' }, { status: 409 })
  }
  return NextResponse.json({ rescheduled: true }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByIp(request, { limit: 5, windowMs: 60_000 }, 'cancel-booking')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  const { id } = await context.params
  const token = tokenFrom(request)
  if (!validUuid(id) || !token) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('turnly_cancel_public_booking', { p_turno_id: id, p_token: token })
  if (error || data !== true) return NextResponse.json({ error: 'No se pudo cancelar la reserva' }, { status: 409 })
  return NextResponse.json({ cancelled: true }, { headers: { 'Cache-Control': 'no-store' } })
}
