import type { Plan } from '@/lib/server/mercadopago-saas'
import { billingConfig, billingRuntime } from '@/lib/server/saas-billing-runtime'
import { NextRequest, NextResponse } from 'next/server'
import { createUserServerClient } from '@/lib/server/supabase'

export async function GET() {
  const user = await createUserServerClient()
  const { data: { user: actor } } = await user.auth.getUser()
  if (!actor) return NextResponse.json({ error: 'Iniciá sesión para continuar' }, { status: 401 })
  const { data, error } = await user.rpc('turnly_commercial_summary')
  if (error) return NextResponse.json({ error: 'No se pudo consultar la suscripción' }, { status: error.code === '42501' ? 403 : 503 })
  if (!data) return NextResponse.json({ error: 'No encontramos un comercio asociado a tu cuenta' }, { status: 404 })
  const config = billingConfig()
  let mandate: { plan: Plan; state: string } | null = null
  if (config) {
    try {
      const state = await billingRuntime(config).rpc<{ plan: Plan; state: string } | null>('turnly_saas_owner', { actor: actor.id })
      if (state?.plan && state.state) mandate = { plan: state.plan, state: state.state }
    } catch { return NextResponse.json({ error: 'No se pudo consultar la autorización de pago' }, { status: 503 }) }
  }
  return NextResponse.json({ ...data, billingEnabled: Boolean(config), mandate }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 415 })
  }
  const body = await request.json().catch(() => null)
  if (body?.action !== 'cancel_renewal' && !(body?.action === 'change_plan' && ['basico', 'pro'].includes(body.plan))) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }
  const user = await createUserServerClient()
  const { data: { user: actor } } = await user.auth.getUser()
  if (!actor) return NextResponse.json({ error: 'Iniciá sesión para continuar' }, { status: 401 })
  const config = billingConfig()
  if (config && body.action === 'cancel_renewal') {
    try {
      const outcome = await billingRuntime(config).provider.cancelOwner(actor.id)
      return NextResponse.json({ outcome }, { status: outcome === 'pending' ? 202 : outcome === 'forbidden' ? 403 : 200 })
    } catch {
      return NextResponse.json({ outcome: 'pending', error: 'La baja requiere confirmación del proveedor' }, { status: 503 })
    }
  }
  if (config && body.action === 'change_plan') {
    if (body.acknowledgeRenewal !== true) return NextResponse.json({ error: 'Confirmá la renovación mensual' }, { status: 400 })
    if (!actor.email || !actor.email_confirmed_at) return NextResponse.json({ error: 'Confirmá el correo de tu cuenta' }, { status: 400 })
    try {
      const result = await billingRuntime(config).provider.start(actor.id, actor.email, body.plan)
      return NextResponse.json(result, { status: result.status === 'forbidden' ? 403 : 200 })
    } catch {
      return NextResponse.json({ status: 'reconciling' }, { status: 202 })
    }
  }
  const { error } = await user.rpc('turnly_commercial_request', {
    action: body.action, desired_plan: body.action === 'change_plan' ? body.plan : null,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la solicitud' }, { status: error.code === '42501' ? 403 : 503 })
  return NextResponse.json({ recorded: true }, { headers: { 'Cache-Control': 'no-store' } })
}
