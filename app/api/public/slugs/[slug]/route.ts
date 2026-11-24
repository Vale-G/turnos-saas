import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server/supabase'

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return NextResponse.json({ available: false })
  const admin = createAdminClient()
  const { data } = await admin.from('negocio').select('id').eq('slug', slug).maybeSingle()
  return NextResponse.json({ available: !data }, { headers: { 'Cache-Control': 'no-store' } })
}
