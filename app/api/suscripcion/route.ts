import { NextRequest, NextResponse } from 'next/server'
import { createUserServerClient } from '@/lib/server/supabase'

export async function GET() {
  const user = await createUserServerClient()
  const { data: { user: actor } } = await user.auth.getUser()
  if (!actor) return NextResponse.json({ error: 'Iniciá sesión para continuar' }, { status: 401 })
  const { data, error } = await user.rpc('turnly_commercial_summary')
  if (error) return NextResponse.json({ error: 'No se pudo consultar la suscripción' }, { status: error.code === '42501' ? 403 : 503 })
  if (!data) return NextResponse.json({ error: 'No encontramos un comercio asociado a tu cuenta' }, { status: 404 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
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
  const { error } = await user.rpc('turnly_commercial_request', {
    action: body.action, desired_plan: body.action === 'change_plan' ? body.plan : null,
  })
  if (error) return NextResponse.json({ error: 'No se pudo registrar la solicitud' }, { status: error.code === '42501' ? 403 : 503 })
  return NextResponse.json({ recorded: true }, { headers: { 'Cache-Control': 'no-store' } })
}
