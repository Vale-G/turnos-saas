import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 💡 Eliminamos el 'customStorageAdapter' complejo que podría estar fallando
// y dejamos que Supabase use su motor nativo que es más estable.

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token', // Nombre estándar y simple
    flowType: 'pkce'
  }
})

// HELPERS DE SESIÓN (Los mantenemos porque son útiles)
export const checkSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const waitForSession = async (maxAttempts = 5, delayMs = 500) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const session = await checkSession()
    if (session) return session
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return null
}