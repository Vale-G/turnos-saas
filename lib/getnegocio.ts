// lib/getNegocio.ts
// Helper centralizado para obtener el negocio del usuario autenticado.
//
// PROBLEMA ORIGINAL: en múltiples páginas existía este patrón con bug:
//
//   const { data: byOwner } = await supabase.from('Negocio').select('*').eq('owner_id', user.id).single()
//   if (byOwner) { neg = byOwner }
//   else {
//     // ⚠️ BUG: hacía EXACTAMENTE la misma query de nuevo — siempre null si la primera falló
//     const { data: byId } = await supabase.from('Negocio').select('*').eq('owner_id', user.id).single()
//     neg = byId
//   }
//
// SOLUCIÓN: una sola función que hace UNA query limpia.
 
import { supabase } from './supabase'
 
export type NegocioBase = {
  id: string
  nombre: string
  slug: string
  tema?: string | null
  logo_url?: string | null
  suscripcion_tipo?: string | null
  trial_hasta?: string | null
  activo?: boolean
  onboarding_completo?: boolean
  whatsapp?: string | null
  descripcion?: string | null
  hora_apertura?: string | null
  hora_cierre?: string | null
  dias_laborales?: number[] | null
  owner_id: string
}
 
/**
 * Obtiene el negocio del usuario autenticado.
 * Retorna null si el usuario no tiene negocio.
 */
export async function getNegocioDelUsuario(userId: string): Promise<NegocioBase | null> {
  const { data, error } = await supabase
    .from('Negocio')
    .select('*')
    .eq('owner_id', userId)
    .single()
 
  if (error || !data) return null
  return data as NegocioBase
}
 
/**
 * Obtiene el usuario autenticado actual.
 * Retorna null si no hay sesión.
 */
export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}