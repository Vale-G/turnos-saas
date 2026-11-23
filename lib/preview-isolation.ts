const qa = 'hwrlimcunbenxsvfbklr'

export function assertPreviewIsolation(env: NodeJS.ProcessEnv) {
  if (env.VERCEL_ENV !== 'preview') return
  if (env.TURNLY_PREVIEW_QA_REF !== qa || env.NEXT_PUBLIC_SUPABASE_URL !== `https://${qa}.supabase.co`) {
    throw new Error('Preview requiere una asignación explícita al proyecto Supabase QA.')
  }
  if (env.NEXT_PUBLIC_SITE_URL === 'https://turnos-saas-eight.vercel.app') {
    throw new Error('Preview no puede usar la URL de producción.')
  }
  for (const key of [env.NEXT_PUBLIC_SUPABASE_ANON_KEY, env.SUPABASE_SERVICE_ROLE_KEY]) {
    if (!key) throw new Error('Preview requiere las claves del proyecto QA.')
    const parts = key.split('.')
    if (parts.length !== 3) continue // Publishable and secret keys are opaque.
    let ref: unknown
    try { ref = JSON.parse(Buffer.from(parts[1], 'base64url').toString()).ref } catch {}
    if (ref !== qa) throw new Error('Preview recibió un JWT de otro proyecto.')
  }
}
