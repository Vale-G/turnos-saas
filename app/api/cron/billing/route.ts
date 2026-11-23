import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { Delivery } from '@/lib/server/mercadopago-saas'
import { billingConfig, billingRuntime } from '@/lib/server/saas-billing-runtime'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const config = billingConfig()
  const secret = process.env.TURNLY_SAAS_WORKER_SECRET
  const actual = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from('Bearer ' + (secret ?? ''))
  if (!config || !secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { rpc, deliver } = billingRuntime(config)
    const events = await rpc<Delivery[]>('turnly_saas_pending')
    const outcomes = await Promise.allSettled(events.map(deliver))
    const failed = outcomes.filter(result => result.status === 'rejected').length
    const review = outcomes.filter(result => result.status === 'fulfilled' && result.value === 'review').length
    const deferred = outcomes.filter(result => result.status === 'fulfilled' && result.value === 'pending').length
    return NextResponse.json({ processed: outcomes.length - failed, failed, review, deferred }, { status: failed ? 503 : 200 })
  } catch { return NextResponse.json({ error: 'No se pudo consultar la cola' }, { status: 503 }) }
}
