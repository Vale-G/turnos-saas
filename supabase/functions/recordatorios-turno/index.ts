
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const resend = new Resend(RESEND_API_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (_req) => {
  try {
    const now = new Date()
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twentyFiveHoursLater = new Date(now.getTime() + 25 * 60 * 60 * 1000)

    // 1. Buscar turnos que necesiten recordatorio
    const { data: turnos, error } = await supabaseAdmin
      .from('turno')
      .select('*, negocio(nombre), servicio(nombre)')
      .gte('start_time', twentyFourHoursLater.toISOString())
      .lt('start_time', twentyFiveHoursLater.toISOString())
      .eq('estado', 'pendiente') // Asumiendo que 'pendiente' es el estado inicial
      .is('recordatorio_enviado', null) // Nueva columna para evitar duplicados

    if (error) throw error
    if (!turnos || turnos.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders to send.' }), { status: 200 })
    }

    const turnosAProcesar = []

    for (const turno of turnos) {
      const subject = `Recordatorio de tu turno en ${turno.negocio.nombre}`
      const text = `
        ¡Hola ${turno.cliente_nombre?.split(' ')[0] || 'Cliente'}!
        
        Solo un recordatorio de tu turno mañana:
        - Negocio: ${turno.negocio.nombre}
        - Servicio: ${turno.servicio.nombre}
        - Fecha: ${new Date(turno.start_time).toLocaleString('es-AR')}
        
        Si necesitás cancelar o reagendar, por favor contactá al negocio.
        ¡Te esperamos!
      `
      
      await resend.emails.send({
        from: 'recordatorios@turnly.app', // Deberás verificar este dominio
        to: turno.cliente_email,
        subject: subject,
        text: text,
      })

      turnosAProcesar.push(turno.id)
    }

    // 2. Marcar turnos como recordados
    if (turnosAProcesar.length > 0) {
      await supabaseAdmin
        .from('turno')
        .update({ recordatorio_enviado: new Date().toISOString() })
        .in('id', turnosAProcesar)
    }

    return new Response(JSON.stringify({ message: `${turnosAProcesar.length} reminders sent.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
