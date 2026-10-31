import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'

async function ownedBusiness() {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
  return data ? { admin, id: data.id } : null
}

export async function GET() {
  const context = await ownedBusiness()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data } = await context.admin.from('negocio').select('mp_access_token').eq('id', context.id).single()
  return NextResponse.json({ connected: Boolean(data?.mp_access_token) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest) {
  const context = await ownedBusiness()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!/^(APP_USR-|TEST-)[A-Za-z0-9._-]{20,300}$/.test(token)) {
    return NextResponse.json({ error: 'El token de Mercado Pago no tiene un formato válido' }, { status: 400 })
  }
  const { error } = await context.admin.from('negocio').update({ mp_access_token: token }).eq('id', context.id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar la credencial' }, { status: 500 })
  return NextResponse.json({ connected: true })
}
