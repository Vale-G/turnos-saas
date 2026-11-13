import { NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { mercadoPagoOAuthAvailable } from '@/lib/server/mercadopago-oauth'
import { hasProAccess } from '@/lib/server/plan-access'

async function ownedBusiness() {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('negocio').select('id,suscripcion_tipo,trial_hasta').eq('owner_id', user.id).maybeSingle()
  return data ? { admin, id: data.id, proAccess: hasProAccess(data) } : null
}

export async function GET() {
  const context = await ownedBusiness()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const [{ data }, { data: legacy }] = await Promise.all([
    context.admin.from('mercadopago_connection')
      .select('mp_user_id,live_mode,token_expires_at').eq('negocio_id', context.id).maybeSingle(),
    context.admin.from('negocio').select('mp_access_token').eq('id', context.id).single(),
  ])
  return NextResponse.json({
    connected: Boolean(data || legacy?.mp_access_token),
    oauth: Boolean(data),
    accountId: data?.mp_user_id ?? null,
    liveMode: data?.live_mode ?? null,
    expiresAt: data?.token_expires_at ?? null,
    available: context.proAccess && mercadoPagoOAuthAvailable(),
    planRequired: !context.proAccess,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE() {
  const context = await ownedBusiness()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { error } = await context.admin.from('mercadopago_connection').delete().eq('negocio_id', context.id)
  const { error: legacyError } = await context.admin.from('negocio').update({ mp_access_token: null }).eq('id', context.id)
  if (error || legacyError) return NextResponse.json({ error: 'No se pudo desconectar Mercado Pago' }, { status: 500 })
  return NextResponse.json({ connected: false })
}
