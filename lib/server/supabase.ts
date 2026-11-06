import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function publicUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL')
  return value
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  return createClient(publicUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function createUserServerClient() {
  const cookieStore = await cookies()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Falta NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return createServerClient(publicUrl(), key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot persist refreshed cookies; middleware does it.
        }
      },
    },
  })
}
