import { NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'

export async function GET() {
  const client = await createUserServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Iniciá sesión para ver tus reservas' }, { status: 401 })
  const { data, error } = await createAdminClient().rpc('turnly_server_customer_history', { customer_id: user.id })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las reservas' }, { status: 503 })
  return NextResponse.json({ reservations: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
