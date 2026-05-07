import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: Request) {
  try {
    // FIX: Inicializamos Resend ADENTRO de la función y con un fallback por las dudas,
    // así el build de Vercel no explota analizando el archivo estáticamente.
    const apiKey = process.env.RESEND_API_KEY || 're_dummy_key_para_build'
    const resend = new Resend(apiKey)

    const body = await req.json()
    const {
      clienteNombre,
      clienteEmail,
      negocioNombre,
      fecha,
      hora,
      servicio,
      emailNegocio,
    } = body

    // 1. Mandar ticket al Cliente
    if (
      clienteEmail &&
      clienteEmail.includes('@') &&
      apiKey !== 're_dummy_key_para_build'
    ) {
      await resend.emails.send({
        from: 'Turnly <onboarding@resend.dev>',
        to: clienteEmail,
        subject: `✨ Turno Confirmado en ${negocioNombre}`,
        html: `
          <div style="font-family: sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; text-align: center;">
            <h1 style="color: #10b981; font-style: italic; text-transform: uppercase; letter-spacing: -1px;">¡Turno Confirmado!</h1>
            <p style="font-size: 16px; color: #94a3b8;">Hola <strong>${clienteNombre.split('·')[0]}</strong>, tu reserva está lista.</p>
            <div style="background-color: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 24px; display: inline-block; text-align: left; margin: 30px 0; max-width: 400px; width: 100%;">
              <p style="margin: 10px 0; font-size: 14px; text-transform: uppercase; color: #cbd5e1;"><strong style="color: #10b981;">🏢 Local:</strong> ${negocioNombre}</p>
              <p style="margin: 10px 0; font-size: 14px; text-transform: uppercase; color: #cbd5e1;"><strong style="color: #10b981;">✂️ Servicio:</strong> ${servicio}</p>
              <p style="margin: 10px 0; font-size: 14px; text-transform: uppercase; color: #cbd5e1;"><strong style="color: #10b981;">📅 Fecha:</strong> ${fecha}</p>
              <p style="margin: 10px 0; font-size: 14px; text-transform: uppercase; color: #cbd5e1;"><strong style="color: #10b981;">⏰ Hora:</strong> ${hora} HS</p>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 20px; text-transform: uppercase; letter-spacing: 2px;">Powered by Turnly</p>
          </div>
        `,
      })
    }

    // 2. Avisarle al Dueño del Local
    if (
      emailNegocio &&
      emailNegocio.includes('@') &&
      apiKey !== 're_dummy_key_para_build'
    ) {
      await resend.emails.send({
        from: 'Turnly Avisos <onboarding@resend.dev>',
        to: emailNegocio,
        subject: `🚀 Nuevo Turno: ${clienteNombre.split('·')[0]}`,
        html: `<div style="font-family: sans-serif;"><h2>¡Nuevo cliente agendado!</h2><p><strong>${clienteNombre.split('·')[0]}</strong> reservó <strong>${servicio}</strong> para el <strong>${fecha}</strong> a las <strong>${hora}</strong>.</p><p>Revisá tu panel de Turnly para más detalles.</p></div>`,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Resend Error]', error)
    return NextResponse.json(
      { error: 'Error enviando correo' },
      { status: 500 }
    )
  }
}
