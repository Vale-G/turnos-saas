import { createHmac, timingSafeEqual } from 'node:crypto'

export type Plan = 'basico' | 'pro'
export type Topic = 'subscription_preapproval' | 'subscription_authorized_payment' | 'payment'
export type Delivery = { topic: Topic; provider_id: string; revision: number }
export type Outcome = 'done' | 'pending' | 'review'
type Mandate = {
  id: string; provider_ref: string | null; plan: Plan; amount: number; currency: string
  anchor: string; state: 'creating' | 'pending' | 'authorized' | 'canceled'; cancel_requested: boolean
  create?: boolean; error?: string
}
type ProviderResource = Record<string, unknown>
export type Rpc = <T>(name: string, args?: Record<string, unknown>) => Promise<T>
export type Config = {
  token: string; secret: string; application: string; collector: string; returnUrl: string; sandbox: boolean
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const identifier = /^[a-zA-Z0-9_-]{1,96}$/
const topics = new Set(['subscription_preapproval', 'subscription_authorized_payment', 'payment'])

function id(value: unknown): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return ''
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function object(value: unknown): ProviderResource {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ProviderResource : {}
}

function money(value: unknown) {
  const text = id(value)
  return /^\d{1,10}(\.\d{1,2})?$/.test(text) ? Math.round(Number(text) * 100) : -1
}

function debitDay(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(?:Z|[-+]\d\d:\d\d)$/.test(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10) + 'T00:00:00.000Z'
}

export function signedDelivery(url: URL, headers: Headers, secret: string, now = Date.now()): { topic: Topic; resource: string } | null {
  if (!secret || url.searchParams.getAll('data.id').length !== 1) return null
  const resource = url.searchParams.get('data.id') ?? ''
  const topic = url.searchParams.get('type') ?? ''
  const requestId = headers.get('x-request-id') ?? ''
  const header = headers.get('x-signature') ?? ''
  const entries = header.split(',').map(part => part.trim().split('='))
  if (entries.filter(([key]) => key === 'ts').length !== 1 || entries.filter(([key]) => key === 'v1').length !== 1) return null
  const { ts, v1 } = Object.fromEntries(entries)
  if (!identifier.test(resource) || !topics.has(topic) || !/^[a-zA-Z0-9_-]{1,120}$/.test(requestId)
      || !/^\d{10}(?:\d{3})?$/.test(ts ?? '') || !/^[a-f0-9]{64}$/i.test(v1 ?? '')) return null
  const timestamp = Number(ts) * (ts.length === 10 ? 1000 : 1)
  if (Math.abs(timestamp - now) > 10 * 60_000) return null
  const expected = createHmac('sha256', secret).update(`id:${resource.toLowerCase()};request-id:${requestId};ts:${ts};`).digest()
  return timingSafeEqual(expected, Buffer.from(v1, 'hex')) ? { topic: topic as Topic, resource } : null
}

export function subscriptionClient(config: Config, rpc: Rpc, transport = fetch) {
  async function api(path: string, method = 'GET', body?: object): Promise<ProviderResource> {
    const response = await transport('https://api.mercadopago.com' + path, {
      method, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', redirect: 'error',
      headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) throw new Error('Mercado Pago no disponible')
    return object(await response.json())
  }

  async function bind(provider: ProviderResource, providerId: string, expected?: string) {
    const reference = id(provider.external_reference)
    if (id(provider.id) !== providerId || !identifier.test(providerId) || !uuid.test(reference)
      || (expected && reference !== expected) || id(provider.collector_id) !== config.collector
      || id(provider.application_id) !== config.application) return null
    const mandate = await rpc<Mandate | null>('turnly_saas_mandate', { reference })
    if (!mandate || (mandate.provider_ref && mandate.provider_ref !== providerId)) return null
    const recurring = object(provider.auto_recurring)
    if (recurring.frequency !== 1 || recurring.frequency_type !== 'months'
      || money(recurring.transaction_amount) !== money(mandate.amount) || recurring.currency_id !== mandate.currency) return null
    const state = provider.status === 'cancelled' ? 'canceled' : provider.status
    if (state !== 'pending' && state !== 'authorized' && state !== 'canceled') return null
    const accepted = await rpc<boolean>('turnly_saas_bind', { reference, provider: providerId, provider_state: state })
    return accepted ? { mandate, state } : null
  }

  function checkoutUrl(value: unknown, providerId: string) {
    if (typeof value !== 'string') return null
    try {
      const url = new URL(value)
      return url.origin === 'https://www.mercadopago.com.ar' && !url.username && !url.password
        && url.pathname === '/subscriptions/checkout' && url.searchParams.get('preapproval_id') === providerId ? url.href : null
    } catch { return null }
  }

  async function start(actor: string, payerEmail: string, plan: Plan) {
    const m = await rpc<Mandate>('turnly_saas_owner', { actor, requested: plan })
    if (m.error) return { status: m.error }
    // A timeout may hide a successful POST. Recover via the signed preapproval notification.
    if (!m.create && !m.provider_ref) return { status: 'reconciling' }
    const provider = m.create ? await api('/preapproval', 'POST', {
      reason: 'Turnly ' + (plan === 'pro' ? 'Pro' : 'Básico'),
      external_reference: m.id, payer_email: payerEmail, status: 'pending', back_url: config.returnUrl,
      auto_recurring: { frequency: 1, frequency_type: 'months', start_date: m.anchor, transaction_amount: m.amount, currency_id: m.currency },
    }) : await api('/preapproval/' + m.provider_ref)
    const providerId = id(provider.id)
    const bound = await bind(provider, providerId, m.id)
    if (!bound) return { status: 'reconciling' }
    if (bound.state !== 'pending') return { status: bound.state }
    const url = checkoutUrl(provider.init_point, providerId)
    return url ? { status: 'checkout', url } : { status: 'reconciling' }
  }

  async function cancel(m: Mandate) {
    if (!m.provider_ref) return false
    await api('/preapproval/' + m.provider_ref, 'PUT', { status: 'cancelled' })
    const confirmed = await api('/preapproval/' + m.provider_ref)
    const bound = await bind(confirmed, m.provider_ref, m.id)
    return bound?.state === 'canceled'
  }

  async function cancelOwner(actor: string) {
    const m = await rpc<Mandate | null>('turnly_saas_owner', { actor })
    if (m?.error) return 'forbidden'
    if (!m?.id) return 'no_mandate'
    if (!await rpc<boolean>('turnly_saas_mark_cancel', { reference: m.id })) return 'pending'
    return await cancel(m) ? 'canceled' : 'pending'
  }

  async function process(topic: Topic, resource: string): Promise<Outcome> {
    if (topic === 'subscription_preapproval') {
      const bound = await bind(await api('/preapproval/' + resource), resource)
      if (!bound) return 'review'
      if (bound.state !== 'canceled' && bound.mandate.cancel_requested) return await cancel(bound.mandate) ? 'done' : 'pending'
      return 'done'
    }
    const invoiceKey = topic === 'payment' ? await rpc<string | null>('turnly_saas_invoice_for_payment', { payment_key: resource }) : resource
    // Payment notifications for other Turnly integrations have no SaaS invoice mapping.
    if (!invoiceKey) return 'done'
    const invoice = await api('/authorized_payments/' + invoiceKey)
    const providerId = id(invoice.preapproval_id)
    if (id(invoice.id) !== invoiceKey || invoice.type !== 'scheduled' || !identifier.test(providerId)) return 'review'
    const provider = await api('/preapproval/' + providerId)
    const bound = await bind(provider, providerId)
    if (!bound || id(invoice.external_reference) !== bound.mandate.id) return 'review'
    const mandate = bound.mandate
    const paymentKey = id(object(invoice.payment).id)
    const day = debitDay(invoice.debit_date)
    if (!day || invoice.currency_id !== mandate.currency || money(invoice.transaction_amount) !== money(mandate.amount)) return 'review'
    if (!paymentKey) return bound.state === 'canceled' ? 'done' : 'pending'
    if (!identifier.test(paymentKey) || (topic === 'payment' && paymentKey !== resource)) return 'review'
    const payment = await api('/v1/payments/' + paymentKey)
    if (id(payment.id) !== paymentKey || id(payment.collector_id) !== config.collector
      || payment.live_mode !== !config.sandbox || payment.currency_id !== mandate.currency
      || money(payment.transaction_amount) !== money(mandate.amount)) return 'review'
    let status = payment.status === 'in_process' ? 'pending' : payment.status === 'cancelled' ? 'rejected' : payment.status
    if (status !== 'approved' && status !== 'pending' && status !== 'rejected' && status !== 'refunded' && status !== 'charged_back') return 'review'
    // A partial refund also invalidates the originally reconciled amount.
    const refunded = money(payment.transaction_amount_refunded ?? 0)
    if (refunded < 0) return 'review'
    if (status === 'approved' && refunded > 0) status = 'partially_refunded'
    return rpc<Outcome>('turnly_saas_apply_invoice', {
      reference: mandate.id, invoice_key: invoiceKey, provider: providerId, debit_day: day, payment_key: paymentKey,
      payment_state: status, amount_paid: mandate.amount, currency_paid: mandate.currency,
    })
  }

  return { start, cancelOwner, process }
}
