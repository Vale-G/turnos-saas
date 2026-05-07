
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const resend = new Resend(RESEND_API_KEY)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 })
  }

  try {
    const { record } = await req.json()

    // 1. Obtener detalles completos del turno
    const { data: turno, error: turnoError } = await supabaseAdmin
      .from('turno')
      .select('*, negocio(nombre, slug), servicio(nombre)')
      .eq('id', record.id)
      .single()

    if (turnoError || !turno) {
      console.error('Error fetching turno:', turnoError)
      return new Response(JSON.stringify({ error: 'Turno no encontrado' }), { status: 404 })
    }
    
    // 2. Construir y enviar el email de confirmación
    const subject = `Turno confirmado para ${turno.negocio.nombre}`
    const text = `
      ¡Hola ${turno.cliente_nombre?.split(' ')[0] || 'Cliente'}!
      
      Tu turno ha sido confirmado:
      - Negocio: ${turno.negocio.nombre}
      - Servicio: ${turno.servicio.nombre}
      - Fecha: ${new Date(turno.fecha + 'T' + turno.hora).toLocaleString('es-AR')}
      
      ¡Te esperamos!
    `
    // En el futuro, podríamos usar un HTML template más bonito
    
    await resend.emails.send({
      from: 'confirmacion@turnly.app', // Deberás verificar este dominio en Resend
      to: turno.cliente_email,
      subject: subject,
      text: text,
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Internal Server Error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
