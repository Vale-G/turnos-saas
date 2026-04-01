import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type Plan = 'basico' | 'pro'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const negocioId = body?.negocioId as string | undefined
    const plan = body?.plan as Plan | undefined

    if (!negocioId || !plan || !['basico', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            try {
              toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch { }
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: rol } = await supabase.from('adminrol').select('role').eq('user_id', user.id).maybeSingle()
    if (rol?.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await supabaseAdmin
      .from('negocio')
      .update({ suscripcion_tipo: plan })
      .eq('id', negocioId)
      .select('id, suscripcion_tipo')
      .single()

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar el plan' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, negocio: data })
  } catch (error) {
    console.error('[superadmin/plan] error', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

