import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { cleanText } from '@/lib/server/public-booking'
import { isThemeId } from '@/lib/theme'
import { isBusinessType, isVisualMode, isVisualStyle } from '@/lib/personalization.mjs'

export async function POST(request: NextRequest) {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  const nombre = cleanText(body.nombre, 100)
  const slug = cleanText(body.slug, 80).toLowerCase()
  const whatsapp = cleanText(body.whatsapp, 30)
  const tema = typeof body.tema === 'string' && isThemeId(body.tema) ? body.tema : 'emerald'
  const rubro = isBusinessType(body.rubro) ? body.rubro : 'general'
  const estiloVisual = isVisualStyle(body.estiloVisual) ? body.estiloVisual : 'sereno'
  const modoVisual = isVisualMode(body.modoVisual) ? body.modoVisual : 'oscuro'
  const apertura = body.apertura
  const cierre = body.cierre
  if (nombre.length < 2 || !/^[a-z0-9-]{3,80}$/.test(slug)
      || typeof apertura !== 'string' || typeof cierre !== 'string'
      || !/^([01]\d|2[0-3]):[0-5]\d$/.test(apertura) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cierre)
      || apertura >= cierre) {
    return NextResponse.json({ error: 'Revisá el nombre, enlace y horarios' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: trialConfig, error: configError } = await admin.from('config').select('valor').eq('clave', 'dias_trial').maybeSingle()
  if (configError) return NextResponse.json({ error: 'No pudimos verificar el período de prueba' }, { status: 503 })
  const configuredDays = Number(trialConfig?.valor)
  const trialDays = Number.isInteger(configuredDays) && configuredDays >= 1 && configuredDays <= 60 ? configuredDays : 14
  const trialUntil = new Date(Date.now() + trialDays * 86400000).toISOString()

  const { data: id, error } = await admin.rpc('turnly_open_business', {
    p_owner: user.id, p_nombre: nombre, p_slug: slug, p_whatsapp: whatsapp, p_tema: tema,
    p_rubro: rubro, p_estilo: estiloVisual, p_modo: modoVisual, p_apertura: apertura,
    p_cierre: cierre, p_trial_hasta: trialUntil,
  })
  if (error?.code === '23505') {
    return NextResponse.json({ error: 'La cuenta ya está asignada a un negocio o el enlace está en uso' }, { status: 409 })
  }
  if (error || !id) return NextResponse.json({ error: 'No se pudo crear el negocio' }, { status: 500 })
  return NextResponse.json({ id }, { status: 201 })
}
