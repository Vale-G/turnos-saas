import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'
import { rateLimitByIp } from '@/lib/rate-limit'

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
}

export async function POST(request: NextRequest) {
  const rate = rateLimitByIp(request, { limit: 4, windowMs: 60_000 }, 'notifications')
  if (!rate.success) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
  const body = await request.json().catch(() => ({}))
  const turnoId = body.turnoId
  const token = body.manageToken
  if (!validUuid(turnoId) || typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: 'Reserva inválida' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: authorized } = await admin.rpc('turnly_verify_manage_token', { p_turno_id: turnoId, p_token: token })
  if (authorized !== true) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  const { data: turno } = await admin.from('turno').select('cliente_nombre,cliente_email,fecha,hora,negocio_id,servicio_id').eq('id', turnoId).maybeSingle()
  if (!turno) return NextResponse.json({ error: 'Reserva inexistente' }, { status: 404 })
  const [{ data: negocio }, { data: servicio }] = await Promise.all([
    admin.from('negocio').select('nombre,email_contacto').eq('id', turno.negocio_id).maybeSingle(),
    admin.from('servicio').select('nombre').eq('id', turno.servicio_id).maybeSingle(),
  ])
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !negocio || !servicio) return NextResponse.json({ queued: false })

  const resend = new Resend(apiKey)
  const clientName = escapeHtml(turno.cliente_nombre ?? 'Cliente')
  const businessName = escapeHtml(negocio.nombre)
  const serviceName = escapeHtml(servicio.nombre)
  const date = escapeHtml(turno.fecha)
  const hour = escapeHtml(turno.hora.slice(0, 5))
  const sends = []
  if (turno.cliente_email?.includes('@')) sends.push(resend.emails.send({
    from: 'Turnly <onboarding@resend.dev>', to: turno.cliente_email,
    subject: `Turno confirmado en ${negocio.nombre}`,
    html: `<div style="font-family:sans-serif"><h1>Turno confirmado</h1><p>Hola ${clientName}.</p><p>${businessName} · ${serviceName}</p><p>${date} a las ${hour}</p></div>`,
  }))
  if (negocio.email_contacto?.includes('@')) sends.push(resend.emails.send({
    from: 'Turnly Avisos <onboarding@resend.dev>', to: negocio.email_contacto,
    subject: 'Nueva reserva en Turnly',
    html: `<div style="font-family:sans-serif"><h2>Nueva reserva</h2><p>${clientName} reservó ${serviceName} para ${date} a las ${hour}.</p></div>`,
  }))
  await Promise.all(sends)
  return NextResponse.json({ queued: sends.length > 0 })
}
