import test from 'node:test'
import assert from 'node:assert/strict'
import { assertPreviewIsolation } from '../lib/preview-isolation.ts'

test('Preview rechaza el host productivo aunque se indique como QA y valida los JWT', () => {
  const ref = 'hwrlimcunbenxsvfbklr'
  const jwt = value => 'header.' + Buffer.from(JSON.stringify({ ref: value })).toString('base64url') + '.signature'
  const config = { VERCEL_ENV: 'preview', TURNLY_PREVIEW_QA_REF: ref,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt(ref), SUPABASE_SERVICE_ROLE_KEY: jwt(ref) }
  assert.doesNotThrow(() => assertPreviewIsolation(config))
  assert.throws(() => assertPreviewIsolation({ ...config, SUPABASE_SERVICE_ROLE_KEY: jwt('production') }))
  assert.throws(() => assertPreviewIsolation({ ...config, NEXT_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }))
  assert.throws(() => assertPreviewIsolation({ ...config, TURNLY_PREVIEW_QA_REF: '' }))
})
