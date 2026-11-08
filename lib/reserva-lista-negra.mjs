/** Valida una configuración de lista negra sin permitir reservas ante datos corruptos. */
export function parsearListaNegra(valor) {
  if (typeof valor !== 'string') return { ok: false, telefonos: [] }
  let lista
  try { lista = JSON.parse(valor) } catch { return { ok: false, telefonos: [] } }
  if (!Array.isArray(lista) || !lista.every(t => typeof t === 'string')) {
    return { ok: false, telefonos: [] }
  }
  return { ok: true, telefonos: lista.map(t => t.replace(/[^0-9]/g, '')) }
}

export function telefonoBloqueado(telefonos, telefono) {
  if (!Array.isArray(telefonos) || typeof telefono !== 'string') return true
  const normalizado = telefono.replace(/[^0-9]/g, '')
  return normalizado.length > 0 && telefonos.includes(normalizado)
}
