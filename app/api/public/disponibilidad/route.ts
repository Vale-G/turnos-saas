import { NextRequest, NextResponse } from 'next/server'
import { generarHorariosDisponibles } from '@/lib/reserva-disponibilidad.mjs'
import { baDate, baMinutes, validDate, validUuid, weekday } from '@/lib/server/public-booking'
import { createAdminClient } from '@/lib/server/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const negocioId = request.nextUrl.searchParams.get('negocioId')
  const servicioId = request.nextUrl.searchParams.get('servicioId')
  const staffId = request.nextUrl.searchParams.get('staffId')
  const fecha = request.nextUrl.searchParams.get('fecha')
  const excludeTurnoId = request.nextUrl.searchParams.get('excludeTurnoId')
  const manageToken = request.nextUrl.searchParams.get('token')
  if (!validUuid(negocioId) || !validUuid(servicioId) || !validUuid(staffId) || !validDate(fecha)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const today = baDate()
  const maxDate = baDate(new Date(Date.now() + 60 * 86400000))
  if (fecha < today || fecha > maxDate) {
    return NextResponse.json({ error: 'Fecha fuera del rango permitido' }, { status: 400 })
  }

  const admin = createAdminClient()
  let canExclude = false
  if (excludeTurnoId || manageToken) {
    if (!validUuid(excludeTurnoId) || !manageToken || !/^[0-9a-f]{64}$/.test(manageToken)) {
      return NextResponse.json({ error: 'Enlace de gestión inválido' }, { status: 400 })
    }
    const { data } = await admin.rpc('turnly_verify_manage_token', { p_turno_id: excludeTurnoId, p_token: manageToken })
    canExclude = data === true
    if (!canExclude) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  }
  const [{ data: negocio }, { data: servicio }, { data: worker }] = await Promise.all([
    admin.from('negocio').select('id,hora_apertura,hora_cierre,dias_laborales,activo').eq('id', negocioId).eq('activo', true).maybeSingle(),
    admin.from('servicio').select('id,negocio_id,duracion').eq('id', servicioId).maybeSingle(),
    admin.from('staff').select('id,negocio_id,activo').eq('id', staffId).eq('activo', true).maybeSingle(),
  ])
  if (!negocio || !servicio || !worker || servicio.negocio_id !== negocio.id || worker.negocio_id !== negocio.id) {
    return NextResponse.json({ error: 'Selección inválida' }, { status: 404 })
  }
  if (!(negocio.dias_laborales ?? []).includes(weekday(fecha))) {
    return NextResponse.json({ horarios: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  let turnosQuery = admin.from('turno').select('hora,duracion_minutos,servicio(duracion)').eq('staff_id', staffId).eq('fecha', fecha).neq('estado', 'cancelado')
  if (canExclude && excludeTurnoId) turnosQuery = turnosQuery.neq('id', excludeTurnoId)
  const [{ data: turnos, error: turnosError }, { data: bloqueos, error: bloqueosError }, { data: reglas, error: reglasError }] = await Promise.all([
    turnosQuery,
    admin.from('bloqueo').select('hora_inicio,hora_fin').eq('staff_id', staffId).eq('fecha', fecha),
    admin.from('bloquehorario').select('recurrente,dia_semana,fecha,hora_inicio,hora_fin').eq('negocio_id', negocioId),
  ])
  if (turnosError || bloqueosError || reglasError) {
    return NextResponse.json({ error: 'No se pudo verificar la disponibilidad' }, { status: 503 })
  }

  const day = weekday(fecha)
  const recurrentes = (reglas ?? []).filter((rule) => rule.fecha === fecha || (rule.recurrente && rule.dia_semana === day))
  const ocupados = (turnos ?? []).map((turno) => {
    const related = Array.isArray(turno.servicio) ? turno.servicio[0] : turno.servicio
    return { hora: turno.hora, duracion: Number(turno.duracion_minutos ?? related?.duracion) }
  })
  const horarios = generarHorariosDisponibles({
    apertura: negocio.hora_apertura ?? '09:00:00',
    cierre: negocio.hora_cierre ?? '18:00:00',
    duracion: Number(servicio.duracion),
    ocupados,
    bloqueos: [...(bloqueos ?? []), ...recurrentes],
    minLimite: fecha === today ? baMinutes() + 15 : 0,
  })

  return NextResponse.json({ horarios }, { headers: { 'Cache-Control': 'no-store' } })
}
