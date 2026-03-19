import { NextRequest, NextResponse } from 'next/server'
import { crearPreferenciaMercadoPago } from '@/lib/mercadopago'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { turnoId, servicioNombre, precio, negocioSlug } = body

    if (!turnoId || !servicioNombre || !precio || !negocioSlug) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
            catch { /* ok */ }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const preferencia = await crearPreferenciaMercadoPago({
      titulo: servicioNombre,
      precio: Number(precio),
      turnoId,
      clienteEmail: user.email ?? '',
      clienteNombre: user.user_metadata?.full_name ?? 'Cliente',
      backUrls: {
        success: `${origin}/reservar/${negocioSlug}?pago=ok&turno=${turnoId}`,
        failure: `${origin}/reservar/${negocioSlug}?pago=error&turno=${turnoId}`,
        pending: `${origin}/reservar/${negocioSlug}?pago=pendiente&turno=${turnoId}`,
      },
    })

    return NextResponse.json({
      id: preferencia.id,
      url: process.env.NODE_ENV === 'production'
        ? preferencia.init_point
        : preferencia.sandbox_init_point,
    })
  } catch (err) {
    console.error('[Turnly] Error checkout:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
