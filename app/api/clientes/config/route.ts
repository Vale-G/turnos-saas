import { hasProAccess } from '@/lib/server/plan-access'
import { parsearListaNegra } from '@/lib/reserva-lista-negra.mjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'

async function ownerContext() {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: negocio } = await admin.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
  return negocio ? { admin, negocioId: negocio.id } : null
}

function keyFor(kind: string | null, negocioId: string, client: string | null) {
  if (kind === 'blacklist') return `blacklist_${negocioId}`
  if (kind === 'notes' && client && client.length <= 200) return `nota_${negocioId}_${client}`
  return null
}

function readConfig(value: string, blacklist: boolean): unknown[] | null {
  if (blacklist && !parsearListaNegra(value).ok) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const context = await ownerContext()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const key = keyFor(request.nextUrl.searchParams.get('kind'), context.negocioId, request.nextUrl.searchParams.get('client'))
  if (!key) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })
  const { data, error } = await context.admin.from('config').select('valor').eq('clave', key).maybeSingle()
  const value = data ? readConfig(data.valor, key.startsWith('blacklist_')) : []
  if (error || value === null) {
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 503 })
  }
  return NextResponse.json({ value }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: NextRequest) {
  const context = await ownerContext()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const key = keyFor(typeof body.kind === 'string' ? body.kind : null, context.negocioId, typeof body.client === 'string' ? body.client : null)
  if (!key || !Array.isArray(body.value) || body.value.length > 200) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  if (body.kind === 'blacklist' && body.value.some((item: unknown) => typeof item !== 'string' || item.length > 30)) {
    return NextResponse.json({ error: 'Lista inválida' }, { status: 400 })
  }
  if (body.kind === 'notes' && !await hasProAccess(context.admin, context.negocioId)) {
    return NextResponse.json({ error: 'La edición de notas está incluida en Pro y en la prueba vigente' }, { status: 403 })
  }
  if (body.kind === 'notes' && body.value.some((item: unknown) => {
    if (!item || typeof item !== 'object') return true
    const note = item as Record<string, unknown>
    return typeof note.texto !== 'string' || note.texto.length > 500 || typeof note.fecha !== 'string'
  })) return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })

  const table = context.admin.from('config')
  const { data: current, error: readError } = await table.select('valor').eq('clave', key).maybeSingle()
  const previous = current ? readConfig(current.valor, body.kind === 'blacklist') : []
  if (readError || previous === null) {
    return NextResponse.json({ error: 'No se pudo verificar la configuración actual' }, { status: 503 })
  }
  const conflict = () => NextResponse.json({ error: 'La configuración cambió. Recargá antes de editarla.' }, { status: 409 })
  if (!Array.isArray(body.previous) || JSON.stringify(body.previous) !== JSON.stringify(previous)) return conflict()

  const valor = JSON.stringify(body.value)
  if (current) {
    const { data, error } = await table.update({ valor }).eq('clave', key).eq('valor', current.valor).select('clave').maybeSingle()
    if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
    if (!data) return conflict()
  } else {
    const { error } = await table.insert({ clave: key, valor })
    if (error?.code === '23505') return conflict()
    if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }
  return NextResponse.json({ saved: true })
}
