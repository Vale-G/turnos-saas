export function buildWhatsAppConfirmacion(
  telefono: string,
  negocioNombre: string,
  fecha: string,
  hora: string
) {
  // Limpiamos el teléfono (sacamos espacios, guiones, símbolos)
  const t = telefono.replace(/\D/g, '')

  const mensaje = `Hola! 👋 Te escribimos de *${negocioNombre}*.
  
Queremos confirmarte que tu turno quedó agendado con éxito:
📅 *Fecha:* ${fecha}
⏰ *Hora:* ${hora} hs

📍 Te esperamos con unos minutos de anticipación.
❌ Si no podés asistir, por favor avisanos respondiendo este mensaje para liberar el lugar.

¡Nos vemos pronto! ✂️🔥`

  const url = `https://wa.me/${t}?text=${encodeURIComponent(mensaje)}`
  return url
}
