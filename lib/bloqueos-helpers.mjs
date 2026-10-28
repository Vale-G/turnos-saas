export function getStaffNombre(staff) {
  if (Array.isArray(staff)) return staff[0]?.nombre
  return staff?.nombre
}

function toMinutes(value) {
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function esRangoHorarioValido(inicio, fin) {
  const inicioMinutos = toMinutes(inicio)
  const finMinutos = toMinutes(fin)
  return inicioMinutos !== null && finMinutos !== null && finMinutos > inicioMinutos
}
