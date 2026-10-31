import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { cleanText } from '@/lib/server/public-booking'
import { isThemeId } from '@/lib/theme'

export async function POST(request: NextRequest) {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  const nombre = cleanText(body.nombre, 100)
  const slug = cleanText(body.slug, 80).toLowerCase()
  const whatsapp = cleanText(body.whatsapp, 30)
  const tema = typeof body.tema === 'string' && isThemeId(body.tema) ? body.tema : 'emerald'
  const apertura = body.apertura
  const cierre = body.cierre
  if (nombre.length < 2 || !/^[a-z0-9-]{3,80}$/.test(slug)
      || typeof apertura !== 'string' || typeof cierre !== 'string'
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(apertura) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cierre)
      || apertura >= cierre) {
    return NextResponse.json({ error: 'Revisá el nombre, enlace y horarios' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: existingOwner }, { data: existingSlug }, { data: trialConfig }] = await Promise.all([
    admin.from('negocio').select('id').eq('owner_id', user.id).maybeSingle(),
    admin.from('negocio').select('id').eq('slug', slug).maybeSingle(),
    admin.from('config').select('valor').eq('clave', 'dias_trial').maybeSingle(),
  ])
  if (existingOwner) return NextResponse.json({ error: 'La cuenta ya tiene un negocio' }, { status: 409 })
  if (existingSlug) return NextResponse.json({ error: 'Ese enlace ya está en uso' }, { status: 409 })
  const configuredDays = Number(trialConfig?.valor)
  const trialDays = Number.isInteger(configuredDays) && configuredDays >= 1 && configuredDays <= 60 ? configuredDays : 14
  const trialUntil = new Date(Date.now() + trialDays * 86400000).toISOString()

  const { data: negocio, error } = await admin.from('negocio').insert({
    owner_id: user.id,
    nombre,
    slug,
    whatsapp,
    tema,
    hora_apertura: `${apertura}:00`,
    hora_cierre: `${cierre}:00`,
    suscripcion_tipo: 'trial',
    trial_hasta: trialUntil,
    onboarding_completo: true,
  }).select('id').single()
  if (error || !negocio) return NextResponse.json({ error: 'No se pudo crear el negocio' }, { status: 500 })

  const { error: roleError } = await admin.from('adminrol').upsert({ user_id: user.id, role: 'owner', negocio_id: negocio.id })
  if (roleError) {
    await admin.from('negocio').delete().eq('id', negocio.id)
    return NextResponse.json({ error: 'No se pudo asignar el propietario' }, { status: 500 })
  }
  return NextResponse.json({ id: negocio.id }, { status: 201 })
}
