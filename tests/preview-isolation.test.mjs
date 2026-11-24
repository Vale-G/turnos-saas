import test from 'node:test'
import assert from 'node:assert/strict'
import { assertPreviewIsolation } from '../lib/preview-isolation.ts'

test('Preview rechaza el host productivo aunque se indique como QA y valida los JWT', () => {
  const ref = 'hwrlimcunbenxsvfbklr'
  const jwt = (value, role) => 'header.' + Buffer.from(JSON.stringify({ ref: value, role })).toString('base64url') + '.signature'
  const config = { VERCEL_ENV: 'preview', VERCEL_URL: 'turnly-example.vercel.app', NEXT_PUBLIC_SITE_URL: 'https://turnly-example.vercel.app', TURNLY_PREVIEW_QA_REF: ref,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(ref, 'anon'), SUPABASE_SERVICE_ROLE_KEY: jwt(ref, 'service_role') }
  assert.doesNotThrow(() => assertPreviewIsolation(config))
  assert.throws(() => assertPreviewIsolation({ ...config, SUPABASE_SERVICE_ROLE_KEY: jwt('production', 'service_role') }))
  assert.throws(() => assertPreviewIsolation({ ...config, NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }))
  assert.throws(() => assertPreviewIsolation({ ...config, TURNLY_PREVIEW_QA_REF: '' }))
  assert.throws(() => assertPreviewIsolation({ ...config, NEXT_PUBLIC_SITE_URL: 'https://turnos-saas-eight.vercel.app' }))
  assert.throws(() => assertPreviewIsolation({ ...config, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_synthetic' }))
  assert.throws(() => assertPreviewIsolation({ ...config, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(ref, 'service_role') }))
  for (const name of ['RESEND_API_KEY', 'MP_ACCESS_TOKEN', 'MP_CLIENT_SECRET', 'CRON_SECRET', 'TURNLY_SAAS_WORKER_SECRET']) {
    assert.throws(() => assertPreviewIsolation({ ...config, [name]: 'synthetic-secret' }),
      error => error.message.includes(name) && !error.message.includes('synthetic-secret'))
  }
  assert.throws(() => assertPreviewIsolation({ ...config, TURNLY_SAAS_BILLING: 'sandbox' }))
  assert.doesNotThrow(() => assertPreviewIsolation({ ...config, TURNLY_SAAS_BILLING: 'disabled' }))
})
