// lib/whatsapp.ts
// Genera links wa.me — no requiere API de pago

export function buildWhatsAppConfirmacion({
  telefono,
  clienteNombre,
  servicio,
  barbero,
  fecha,
  hora,
  negocioNombre,
}: {
  telefono: string
  clienteNombre: string
  servicio: string
  barbero: string
  fecha: string
  hora: string
  negocioNombre: string
}) {
  const fechaFormateada = new Date(fecha + 'T00:00:00')
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const mensaje = [
    `✂️ *Nuevo turno confirmado en ${negocioNombre}*`,
    ``,
    `👤 Cliente: ${clienteNombre}`,
    `💈 servicio: ${servicio}`,
    `👨‍🦲 Con: ${barbero}`,
    `📅 Fecha: ${fechaFormateada}`,
    `🕐 Hora: ${hora} hs`,
    ``,
    `_Reservado desde turnly.app_`,
  ].join('\n')

  const numeroLimpio = telefono.replace(/\D/g, '')
  return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
}

export function buildWhatsAppRecordatorio({
  telefono,
  clienteNombre,
  servicio,
  hora,
  negocioNombre,
}: {
  telefono: string
  clienteNombre: string
  servicio: string
  fecha: string
  hora: string
  negocioNombre: string
}) {
  const mensaje = [
    `⏰ *Recordatorio de turno — ${negocioNombre}*`,
    ``,
    `Hola ${clienteNombre}! Te recordamos que mañana tenés turno:`,
    `💈 ${servicio} a las ${hora} hs`,
    ``,
    `¿Necesitás cancelar? Respondé este mensaje.`,
  ].join('\n')

  const numeroLimpio = telefono.replace(/\D/g, '')
  return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
}

export function buildWhatsAppNuevoTurno({
  telefono, clienteNombre, servicio, barbero, fecha, hora, negocioNombre
}: {
  telefono: string; clienteNombre: string; servicio: string
  barbero: string; fecha: string; hora: string; negocioNombre: string
}): string {
  const fechaFormateada = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const texto = [
    '🔔 *Nuevo turno en ' + negocioNombre + '*',
    '',
    '👤 Cliente: ' + clienteNombre,
    '✂️ servicio: ' + servicio,
    '💈 Con: ' + barbero,
    '📅 ' + fechaFormateada,
    '🕐 ' + hora,
    '',
    '_Notificación automática de Turnly_'
  ].join('\n')
  const numero = telefono.replace(/\D/g, '')
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto)
}
