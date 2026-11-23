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

export async function GET(request: NextRequest) {
  const context = await ownerContext()
  if (!context) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const key = keyFor(request.nextUrl.searchParams.get('kind'), context.negocioId, request.nextUrl.searchParams.get('client'))
  if (!key) return NextResponse.json({ error: 'Consulta inválida' }, { status: 400 })
  const { data, error } = await context.admin.from('config').select('valor').eq('clave', key).maybeSingle()
  if (error || (key.startsWith('blacklist_') && data && !parsearListaNegra(data.valor).ok)) {
    return NextResponse.json({ error: 'No se pudo leer la configuración' }, { status: 503 })
  }
  let value: unknown[] = []
  try { value = data?.valor ? JSON.parse(data.valor) : [] } catch { value = [] }
  return NextResponse.json({ value: Array.isArray(value) ? value : [] }, { headers: { 'Cache-Control': 'no-store' } })
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

  if (body.kind === 'blacklist') {
    const table = context.admin.from('config')
    const { data: current, error: readError } = await table.select('valor').eq('clave', key).maybeSingle()
    if (readError || (current && !parsearListaNegra(current.valor).ok)) {
      return NextResponse.json({ error: 'No se pudo verificar la lista actual' }, { status: 503 })
    }
    const conflict = () => NextResponse.json({ error: 'La lista cambió. Recargá antes de editarla.' }, { status: 409 })
    if (!Array.isArray(body.previous) || JSON.stringify(body.previous) !== JSON.stringify(current ? JSON.parse(current.valor) : [])) {
      return conflict()
    }
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

  const { error } = await context.admin.from('config').upsert({ clave: key, valor: JSON.stringify(body.value) }, { onConflict: 'clave' })
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  return NextResponse.json({ saved: true })
}
