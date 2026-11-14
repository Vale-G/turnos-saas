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

/** Encapsula fallos de red y configuración; nunca autoriza ante una consulta fallida. */
export async function verificarListaNegra(consultar, telefono) {
  try {
    const { data, error } = await consultar()
    if (error) return { permitido: false, motivo: 'consulta' }
    if (!data?.valor) return { permitido: true, motivo: null }
    const lista = parsearListaNegra(data.valor)
    if (!lista.ok) return { permitido: false, motivo: 'configuracion' }
    if (lista.telefonos.length > 0 && (!telefono || !String(telefono).replace(/[^0-9]/g, ''))) {
      return { permitido: false, motivo: 'telefono' }
    }
    if (telefonoBloqueado(lista.telefonos, telefono)) return { permitido: false, motivo: 'bloqueado' }
    return { permitido: true, motivo: null }
  } catch {
    return { permitido: false, motivo: 'consulta' }
  }
}
