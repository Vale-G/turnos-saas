import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'
import { rateLimitByIp } from '@/lib/rate-limit'
import { businessNewBookingEmail, customerConfirmationEmail } from '@/lib/notifications.mjs'

type NotificationKind = 'customer-confirmation' | 'business-new-booking'

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
  if (!negocio || !servicio) return NextResponse.json({ error: 'Datos de reserva incompletos' }, { status: 500 })
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Correo no configurado', configured: false }, { status: 503 })

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'Turnly <onboarding@resend.dev>'
  const common = { clientName: turno.cliente_nombre ?? 'Cliente', businessName: negocio.nombre, serviceName: servicio.nombre, date: turno.fecha, hour: turno.hora.slice(0, 5) }
  const jobs: Array<{ kind: NotificationKind; to: string; subject: string; html: string }> = []
  if (turno.cliente_email?.includes('@')) {
    const email = customerConfirmationEmail({ ...common, manageUrl: `${request.nextUrl.origin}/cancelar/${turnoId}?token=${token}` })
    jobs.push({ kind: 'customer-confirmation', to: turno.cliente_email, ...email })
  }
  if (negocio.email_contacto?.includes('@')) {
    jobs.push({ kind: 'business-new-booking', to: negocio.email_contacto, ...businessNewBookingEmail(common) })
  }

  const results = await Promise.all(jobs.map(async (job) => {
    const { data: claimed } = await admin.rpc('turnly_claim_notification', { p_turno_id: turnoId, p_kind: job.kind })
    if (claimed !== true) return 'skipped'
    const result = await resend.emails.send({ from, to: job.to, subject: job.subject, html: job.html })
    const sent = !result.error && Boolean(result.data?.id)
    await admin.rpc('turnly_complete_notification', {
      p_turno_id: turnoId, p_kind: job.kind, p_status: sent ? 'sent' : 'failed',
      p_provider_id: result.data?.id ?? null, p_error: result.error?.message ?? null,
    })
    return sent ? 'sent' : 'failed'
  }))
  const sent = results.filter((result) => result === 'sent').length
  const failed = results.filter((result) => result === 'failed').length
  const skipped = results.filter((result) => result === 'skipped').length
  return NextResponse.json({ sent, failed, skipped }, { status: failed > 0 && sent === 0 ? 502 : 200 })
}
