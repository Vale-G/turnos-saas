import { NextRequest, NextResponse } from 'next/server'
import { createUserServerClient } from '@/lib/server/supabase'
import { validUuid } from '@/lib/server/public-booking'

async function inspect(business: unknown, incident?: string) {
  if (!validUuid(business)) return NextResponse.json({ error: 'Comercio inválido' }, { status: 400 })
  const user = await createUserServerClient()
  const { data: { user: actor } } = await user.auth.getUser()
  if (!actor) return NextResponse.json({ error: 'Iniciá sesión para continuar' }, { status: 401 })
  const { data, error } = await user.rpc('turnly_commercial_support', { business, incident: incident ?? null })
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '22023' ? 400 : 503
    return NextResponse.json({ error: 'No se pudo gestionar la incidencia' }, { status })
  }
  if (!data) return NextResponse.json({ error: 'Comercio inexistente' }, { status: 404 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export function GET(request: NextRequest) {
  return inspect(request.nextUrl.searchParams.get('negocioId'))
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (typeof body?.incident !== 'string') return NextResponse.json({ error: 'Nota inválida' }, { status: 400 })
  return inspect(body.negocioId, body.incident)
}
