const qa = 'hwrlimcunbenxsvfbklr'

const blocked = [
  'SERVICE_ROLE_KEY', 'SUPABASESERVICEROLEKEY', 'MP_PUBLIC_KEY',
  'MP_ACCESS_TOKEN', 'MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_CREDENTIALS_ENCRYPTION_KEY',
  'MP_OAUTH_REDIRECT_URI', 'MP_OAUTH_STATE_SECRET', 'MP_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CRON_SECRET',
  'TURNLY_SAAS_MP_APPLICATION_ID', 'TURNLY_SAAS_MP_COLLECTOR_ID', 'TURNLY_SAAS_MP_TEST_TOKEN',
  'TURNLY_SAAS_MP_WEBHOOK_SECRET', 'TURNLY_SAAS_SANDBOX_ORIGIN', 'TURNLY_SAAS_WORKER_SECRET',
]

export function assertPreviewIsolation(env: NodeJS.ProcessEnv) {
  if (env.VERCEL_ENV !== 'preview') return
  if (env.TURNLY_PREVIEW_QA_REF !== qa || env.NEXT_PUBLIC_SUPABASE_URL !== `https://${qa}.supabase.co`) {
    throw new Error('Preview requiere una asignación explícita al proyecto Supabase QA.')
  }
  const host = env.VERCEL_URL
  if (!host || !/^[a-z0-9-]+[.]vercel[.]app$/.test(host) || host === 'turnos-saas-eight.vercel.app'
    || env.NEXT_PUBLIC_SITE_URL !== `https://${host}`) {
    throw new Error('Preview requiere su propia URL de Vercel.')
  }
  for (const [key, role] of [
    [env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'anon'],
    [env.SUPABASE_SERVICE_ROLE_KEY, 'service_role'],
  ]) {
    const parts = key?.split('.')
    let claims: { ref?: string; role?: string } | null = null
    if (parts?.length === 3 && parts.every(Boolean)) {
      try { claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) } catch {}
    }
    if (claims?.ref !== qa || claims?.role !== role) {
      throw new Error('Preview requiere JWT identificables de QA con el rol esperado.')
    }
  }
  const inherited = blocked.filter(name => Boolean(env[name]))
  if (env.TURNLY_REMINDERS_ENABLED === 'true') inherited.push('TURNLY_REMINDERS_ENABLED')
  if (env.TURNLY_SAAS_BILLING && env.TURNLY_SAAS_BILLING !== 'disabled') inherited.push('TURNLY_SAAS_BILLING')
  if (inherited.length) {
    throw new Error('Preview hereda variables que deben quedar desactivadas: ' + inherited.join(', '))
  }
}
