import { brandConfig } from '@/config/brand'

type ReservationConfirmationEmailProps = {
  clienteNombre: string
  negocioNombre: string
  fecha: string
  hora: string
  servicio: string
  precio: string
}

export function buildReservationConfirmationEmail({
  clienteNombre,
  negocioNombre,
  fecha,
  hora,
  servicio,
  precio,
}: ReservationConfirmationEmailProps) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f1f5f9; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
      <div style="background:#020617;color:white;padding:28px 30px;">
        <h1 style="margin:0;font-size:24px;font-style:italic;">✅ Reserva confirmada</h1>
        <p style="margin-top:10px;color:#94a3b8;font-size:14px;">Gracias por reservar con ${brandConfig.appName}.</p>
      </div>
      <div style="padding:28px 30px;color:#0f172a;">
        <p style="margin:0 0 14px;">Hola <strong>${clienteNombre}</strong>, este es tu comprobante digital:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
          <p><strong>Negocio:</strong> ${negocioNombre}</p>
          <p><strong>Servicio:</strong> ${servicio}</p>
          <p><strong>Fecha:</strong> ${fecha}</p>
          <p><strong>Hora:</strong> ${hora}</p>
          <p><strong>Precio:</strong> ${precio}</p>
        </div>
      </div>
    </div>
  </div>
  `
}
