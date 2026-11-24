import { NextRequest, NextResponse } from 'next/server'
import { signedDelivery } from '@/lib/server/mercadopago-saas'
import { billingConfig, billingRuntime } from '@/lib/server/saas-billing-runtime'

export async function POST(request: NextRequest) {
  const config = billingConfig()
  if (!config) return NextResponse.json({ error: 'Facturación recurrente deshabilitada' }, { status: 503 })
  const event = signedDelivery(request.nextUrl, request.headers, config.secret)
  if (!event) return NextResponse.json({ error: 'Notificación inválida' }, { status: 401 })
  try {
    const { rpc } = billingRuntime(config)
    await rpc('turnly_saas_enqueue', { event_topic: event.topic, resource: event.resource })
    return new Response(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'No se pudo registrar la notificación' }, { status: 503 })
  }
}
