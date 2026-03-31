import { supabase } from './supabase'

export type NegocioBase = {
  id: string
  nombre: string
  slug: string
  tema?: string | null
  logo_url?: string | null
  suscripcion_tipo?: string | null
  owner_id: string
  [key: string]: any // Para abarcar el resto de campos
}

export async function getNegocioDelUsuario(userId: string) {
  // 1. ¿Es empleado (staff o admin)?
  const { data: adm } = await supabase.from('adminrol').select('negocio_id, role').eq('user_id', userId).maybeSingle()
  
  let nId = adm?.negocio_id
  let role = adm?.role || null

  // 2. ¿Es el dueño original?
  if (!nId) {
    const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', userId).maybeSingle()
    if (n) {
      nId = n.id
      role = 'owner'
    }
  }

  // 3. Traer los datos completos del local
  if (nId) {
    const { data: neg, error } = await supabase.from('negocio').select('*').eq('id', nId).single()
    if (!error && neg) {
      return { negocio: neg as NegocioBase, role }
    }
  }

  return { negocio: null, role: null }
}

export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
