// Ayuda de interfaz: no sustituye la validación transaccional de reservas en el servidor.
function toMinutes(hora) {
  if (typeof hora !== 'string') return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(hora)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function toHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/**
 * Genera los horarios de inicio de una jornada sin exceder el cierre ni cruzar bloqueos.
 * Los turnos existentes solo incluyen su hora de inicio; no se puede deducir su duración.
 */
export function generarHorariosDisponibles({ apertura, cierre, duracion, ocupados = [], bloqueos = [], minLimite = 0 }) {
  const inicio = toMinutes(apertura)
  const fin = toMinutes(cierre)
  const minutosServicio = Number(duracion)
  if (inicio === null || fin === null || fin <= inicio ||
      !Number.isInteger(minutosServicio) || minutosServicio <= 0 || minutosServicio > 1440) {
    return []
  }

  const ocupaciones = (Array.isArray(ocupados) ? ocupados : [])
    .map(toMinutes)
    .filter((hora) => hora !== null)

  const intervalosBloqueados = (Array.isArray(bloqueos) ? bloqueos : [])
    .map((bloqueo) => ({
      inicio: toMinutes(bloqueo?.hora_inicio),
      fin: toMinutes(bloqueo?.hora_fin),
    }))
    .filter((bloqueo) => bloqueo.inicio !== null && bloqueo.fin !== null && bloqueo.fin > bloqueo.inicio)

  const limite = Number.isFinite(minLimite) ? minLimite : 0
  const disponibles = []
  for (let actual = inicio; actual + minutosServicio <= fin; actual += minutosServicio) {
    const final = actual + minutosServicio
    if (actual < limite) continue
    // Sin duración de los turnos existentes, solo se pueden excluir sus inicios conocidos.
    if (ocupaciones.some((hora) => hora >= actual && hora < final)) continue
    if (intervalosBloqueados.some((bloqueo) => actual < bloqueo.fin && final > bloqueo.inicio)) continue
    disponibles.push(toHora(actual))
  }
  return disponibles
}
