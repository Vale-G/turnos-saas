import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReservationConfirmationEmail } from '@/components/emails/ReservationConfirmationEmail'

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    const body = await req.json()
    const { clienteNombre, clienteEmail, negocioNombre, fecha, hora, servicio, precio } = body

    if (!clienteEmail || typeof clienteEmail !== 'string' || !clienteEmail.includes('@')) {
      return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 400 })
    }

    const html = await render(
      ReservationConfirmationEmail({
        clienteNombre: String(clienteNombre || 'Cliente'),
        negocioNombre: String(negocioNombre || 'Negocio'),
        fecha: String(fecha || ''),
        hora: String(hora || ''),
        servicio: String(servicio || ''),
        precio: String(precio || ''),
      })
    )

    await resend.emails.send({
      from: `${negocioNombre || 'Turnly'} <onboarding@resend.dev>`,
      to: clienteEmail,
      subject: `Tu reserva está confirmada · ${negocioNombre || 'Turnly'}`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la solicitud' }, { status: 500 })
  }
}
