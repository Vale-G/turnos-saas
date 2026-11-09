import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'

async function authorize() {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const { data: role } = await userClient.from('adminrol').select('role').eq('user_id', user.id).maybeSingle()
  return role?.role === 'superadmin' ? createAdminClient() : null
}

export async function POST(request: NextRequest) {
  const admin = await authorize()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const negocioId = body.negocioId
  const plan = body.plan
  if (!validUuid(negocioId) || (plan !== 'basico' && plan !== 'pro')) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }
  const { data, error } = await admin.from('negocio').update({ suscripcion_tipo: plan }).eq('id', negocioId).select('id,suscripcion_tipo').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'No se pudo actualizar el plan' }, { status: 404 })
  return NextResponse.json({ negocio: data })
}

export async function PATCH(request: NextRequest) {
  const admin = await authorize()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  if (!validUuid(body.negocioId) || !Number.isInteger(body.dias) || body.dias < 1 || body.dias > 60) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }
  const trialHasta = new Date(Date.now() + body.dias * 86400000).toISOString()
  const { data, error } = await admin.from('negocio').update({ trial_hasta: trialHasta, suscripcion_tipo: 'trial' }).eq('id', body.negocioId).select('id,trial_hasta,suscripcion_tipo').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'No se pudo extender el trial' }, { status: 404 })
  return NextResponse.json({ negocio: data })
}

export async function DELETE(request: NextRequest) {
  const admin = await authorize()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const negocioId = request.nextUrl.searchParams.get('negocioId')
  if (!validUuid(negocioId)) return NextResponse.json({ error: 'Negocio inválido' }, { status: 400 })
  const { data, error } = await admin.from('negocio').delete().eq('id', negocioId).select('id').maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'No se pudo eliminar el negocio' }, { status: 404 })
  return NextResponse.json({ deleted: true })
}
