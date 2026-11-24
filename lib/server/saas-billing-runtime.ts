import 'server-only'
import { createAdminClient } from '@/lib/server/supabase'
import { subscriptionClient, type Config, type Delivery, type Rpc } from '@/lib/server/mercadopago-saas'

export function billingConfig(): Config | null {
  if (process.env.TURNLY_SAAS_BILLING !== 'sandbox') return null
  const token = process.env.TURNLY_SAAS_MP_TEST_TOKEN ?? ''
  const secret = process.env.TURNLY_SAAS_MP_WEBHOOK_SECRET ?? ''
  const application = process.env.TURNLY_SAAS_MP_APPLICATION_ID ?? ''
  const collector = process.env.TURNLY_SAAS_MP_COLLECTOR_ID ?? ''
  try {
    const db = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '')
    if (db.origin !== 'https://hwrlimcunbenxsvfbklr.supabase.co' || db.pathname !== '/' || db.search || db.hash
      || !token.startsWith('TEST-') || !secret || !/^\d+$/.test(application) || !/^\d+$/.test(collector)
      || site.protocol !== 'https:' || site.username || site.password
      || site.hostname === 'turnos-saas-eight.vercel.app'
      || site.origin !== process.env.TURNLY_SAAS_SANDBOX_ORIGIN
      || process.env.VERCEL_ENV === 'production') return null
    return { token, secret, application, collector, returnUrl: new URL('/upgrade', site).href, sandbox: true }
  } catch { return null }
}

export function billingRuntime(config: Config) {
  const client = createAdminClient()
  const rpc: Rpc = async (name, args) => {
    const { error, data } = await client.rpc(name, args)
    if (error) throw new Error('No se pudo conciliar la suscripción')
    return data
  }
  const provider = subscriptionClient(config, rpc)
  async function deliver(event: Delivery) {
    const outcome = await provider.process(event.topic, event.provider_id).catch(() => 'pending' as const)
    await rpc('turnly_saas_finish', { event_topic: event.topic, resource: event.provider_id, generation: event.revision, result: outcome })
    return outcome
  }
  return { rpc, provider, deliver }
}
