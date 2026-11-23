import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/server/supabase'
import { escapeHtml } from '@/lib/notifications.mjs'
import { reminderDue } from '@/lib/reminder-schedule.mjs'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const supplied = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  if (!secret || secret.length < 32 || Buffer.byteLength(supplied)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))) return NextResponse.json({ error:'No autorizado' },{status:401})
  if (process.env.TURNLY_REMINDERS_ENABLED !== 'true') return NextResponse.json({ enabled:false })
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return NextResponse.json({error:'Correo no configurado'},{status:503})
  const admin = createAdminClient()
  const now = new Date()
  const start = new Date(now.getTime()-86400000).toISOString().slice(0,10)
  const end = new Date(now.getTime()+3*86400000).toISOString().slice(0,10)
  const { data: businesses, error } = await admin.from('negocio').select('id,nombre,zona_horaria').eq('activo',true).eq('recordatorios_activos',true)
  if (error) return NextResponse.json({error:'No se pudieron consultar recordatorios'},{status:503})
  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent=0, failed=0, skipped=0
  for (const business of businesses ?? []) {
    const { data: bookings, error: queryError } = await admin.from('turno').select('id,fecha,hora,cliente_email').eq('negocio_id',business.id).eq('estado','confirmado').gte('fecha',start).lte('fecha',end)
    if (queryError) { failed++; continue }
    for (const booking of bookings ?? []) {
      if (!booking.cliente_email || !reminderDue(booking.fecha,booking.hora,business.zona_horaria,now)) continue
      const kind=`reminder:${booking.fecha}:${booking.hora}`
      const {data:claimed,error:claimError}=await admin.rpc('turnly_claim_notification',{p_turno_id:booking.id,p_kind:kind})
      if (claimError) { failed++; continue }
      if (claimed!==true) { skipped++; continue }
      try {
        // Recheck cancellation/reschedule after acquiring the claim.
        const {data:current}=await admin.from('turno').select('estado,fecha,hora').eq('id',booking.id).maybeSingle()
        if (!current || current.estado!=='confirmado' || current.fecha!==booking.fecha || current.hora!==booking.hora) { skipped++; continue }
        const result=await resend.emails.send({from:process.env.RESEND_FROM_EMAIL!,to:booking.cliente_email,subject:`Recordatorio de tu turno en ${business.nombre}`,html:`<p>Tu turno en ${escapeHtml(business.nombre)} es el ${escapeHtml(booking.fecha)} a las ${escapeHtml(booking.hora.slice(0,5))} (${escapeHtml(business.zona_horaria)}).</p>`},{idempotencyKey:`turnly-${booking.id}-${kind}`})
        if (result.error || !result.data?.id) throw new Error('No se pudo enviar')
        const {error:completeError}=await admin.rpc('turnly_complete_notification',{p_turno_id:booking.id,p_kind:kind,p_status:'sent',p_provider_id:result.data.id})
        if (completeError) { failed++; continue }
        sent++
      } catch {
        await admin.rpc('turnly_complete_notification',{p_turno_id:booking.id,p_kind:kind,p_status:'failed',p_error:'Error de envío'})
        failed++
      }
    }
  }
  return NextResponse.json({sent,failed,skipped},{status:failed?503:200,headers:{'Cache-Control':'no-store'}})
}
