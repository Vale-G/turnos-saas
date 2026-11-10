const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }
export function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => HTML_ENTITIES[char]) }
export function formatBookingDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00-03:00`))
}
function shell(content) { return `<div style="background:#020617;padding:28px 16px;font-family:Arial,sans-serif;color:#e2e8f0"><div style="max-width:560px;margin:auto;background:#0f172a;border:1px solid #1e293b;border-radius:24px;padding:28px"><div style="font-size:22px;font-weight:800;margin-bottom:20px">turn<span style="color:#6366f1">ly</span></div>${content}<p style="color:#64748b;font-size:12px;margin:24px 0 0">Este mensaje fue generado por una reserva realizada en Turnly.</p></div></div>` }
export function customerConfirmationEmail({clientName,businessName,serviceName,date,hour,manageUrl}) {
  return {subject:`Turno confirmado en ${businessName}`,html:shell(`<h1 style="font-size:26px;margin:0 0 14px">Tu turno está confirmado</h1><p>Hola ${escapeHtml(clientName)}.</p><p><strong>${escapeHtml(businessName)}</strong><br>${escapeHtml(serviceName)}<br>${escapeHtml(formatBookingDate(date))} a las ${escapeHtml(hour)} hs</p><a href="${escapeHtml(manageUrl)}" style="display:inline-block;background:#6366f1;color:white;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700;margin-top:10px">Gestionar o cancelar turno</a><p style="color:#94a3b8;font-size:12px">Este enlace es privado. No lo compartas.</p>`) }
}
export function businessNewBookingEmail({clientName,serviceName,date,hour}) {
  return {subject:'Nueva reserva en Turnly',html:shell(`<h1 style="font-size:26px;margin:0 0 14px">Nueva reserva</h1><p><strong>${escapeHtml(clientName)}</strong> reservó ${escapeHtml(serviceName)}.</p><p>${escapeHtml(formatBookingDate(date))} a las ${escapeHtml(hour)} hs.</p>`) }
}
