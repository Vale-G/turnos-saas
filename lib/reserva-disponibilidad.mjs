// Filtro de interfaz, no es una validación transaccional ni reemplaza RLS.
function toMinutes(hora) {
  if (typeof hora !== 'string') return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(hora)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function toHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/**
 * Excluye intersecciones con intervalos ocupados y bloqueos.
 * Si faltan duraciones o hay intervalos inválidos, no ofrece franjas (fail-closed).
 */
export function generarHorariosDisponibles({ apertura, cierre, duracion, ocupados = [], bloqueos = [], minLimite = 0 }) {
  const inicio = toMinutes(apertura)
  const fin = toMinutes(cierre)
  const minutosServicio = Number(duracion)
  if (inicio === null || fin === null || fin <= inicio ||
      !Number.isInteger(minutosServicio) || minutosServicio <= 0 || minutosServicio > 1440 ||
      !Array.isArray(ocupados) || !Array.isArray(bloqueos)) {
    return []
  }

  const ocupaciones = ocupados.map((ocupado) => {
    const desde = toMinutes(ocupado?.hora)
    const minutos = Number(ocupado?.duracion)
    if (desde === null || !Number.isInteger(minutos) || minutos <= 0 || minutos > 1440) return null
    return { inicio: desde, fin: desde + minutos }
  })
  const intervalosBloqueados = bloqueos.map((bloqueo) => {
    const desde = toMinutes(bloqueo?.hora_inicio)
    const hasta = toMinutes(bloqueo?.hora_fin)
    if (desde === null || hasta === null || hasta <= desde) return null
    return { inicio: desde, fin: hasta }
  })
  if (ocupaciones.some((x) => x === null) || intervalosBloqueados.some((x) => x === null)) return []

  const limite = Number.isFinite(minLimite) ? minLimite : 0
  const disponibles = []
  for (let actual = inicio; actual + minutosServicio <= fin; actual += minutosServicio) {
    const final = actual + minutosServicio
    if (actual < limite) continue
    if (ocupaciones.some((ocupacion) => actual < ocupacion.fin && final > ocupacion.inicio)) continue
    if (intervalosBloqueados.some((bloqueo) => actual < bloqueo.fin && final > bloqueo.inicio)) continue
    disponibles.push(toHora(actual))
  }
  return disponibles
}
