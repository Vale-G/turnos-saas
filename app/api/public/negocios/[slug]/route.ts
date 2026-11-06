import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/server/supabase'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!/^[a-z0-9-]{2,80}$/i.test(slug)) {
    return NextResponse.json({ error: 'Negocio inexistente' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: negocio, error } = await admin
    .from('negocio')
    .select('id,nombre,slug,descripcion,logo_url,whatsapp,tema,hora_apertura,hora_cierre,dias_laborales,activo,email_contacto,moneda,zona_horaria')
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle()

  if (error || !negocio) return NextResponse.json({ error: 'Negocio inexistente' }, { status: 404 })

  const [{ data: servicios, error: serviceError }, { data: staff, error: staffError }] = await Promise.all([
    admin.from('servicio').select('id,nombre,descripcion,precio,duracion,seña_tipo,seña_valor').eq('negocio_id', negocio.id).order('nombre'),
    admin.from('staff').select('id,nombre,avatar_url').eq('negocio_id', negocio.id).eq('activo', true).order('nombre'),
  ])

  if (serviceError || staffError) {
    return NextResponse.json({ error: 'No se pudo cargar la agenda' }, { status: 503 })
  }

  return NextResponse.json(
    { negocio, servicios: servicios ?? [], staff: staff ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' } },
  )
}
