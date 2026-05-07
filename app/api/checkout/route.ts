import { crearPreferenciaMercadoPago } from '@/lib/mercadopago'
import { rateLimitByIp } from '@/lib/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const rate = rateLimitByIp(req, { limit: 5, windowMs: 60_000 }, 'checkout')

    if (!rate.success) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intentá nuevamente en unos segundos.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.retryAfter),
            'X-RateLimit-Limit': String(rate.limit),
            'X-RateLimit-Remaining': String(rate.remaining),
            'X-RateLimit-Reset': String(rate.reset),
          },
        }
      )
    }

    const body = await req.json()
    const { turnoId, servicioId, negocioSlug, precio: precioCliente } = body

    if (!turnoId || !servicioId || !negocioSlug) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
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
              toSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              return
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: turno, error: turnoError } = await supabase
      .from('turno')
      .select('id, negocio_id, servicio_id')
      .eq('id', turnoId)
      .single()

    if (turnoError || !turno) {
      return NextResponse.json({ error: 'Turno inexistente' }, { status: 404 })
    }

    if (turno.servicio_id !== servicioId) {
      return NextResponse.json(
        { error: 'Servicio inválido para el turno' },
        { status: 400 }
      )
    }

    const { data: negocio, error: negocioError } = await supabase
      .from('negocio')
      .select('id, slug')
      .eq('id', turno.negocio_id)
      .single()

    if (negocioError || !negocio) {
      return NextResponse.json(
        { error: 'Negocio inexistente' },
        { status: 404 }
      )
    }

    if (negocio.slug !== negocioSlug) {
      return NextResponse.json({ error: 'Negocio inválido' }, { status: 400 })
    }

    const { data: servicio, error: servicioError } = await supabase
      .from('servicio')
      .select('id, nombre, precio, negocio_id')
      .eq('id', servicioId)
      .single()

    if (servicioError || !servicio) {
      return NextResponse.json(
        { error: 'Servicio inexistente' },
        { status: 404 }
      )
    }

    if (servicio.negocio_id !== turno.negocio_id) {
      return NextResponse.json(
        { error: 'Servicio no corresponde al negocio del turno' },
        { status: 400 }
      )
    }

    const precioReal = Number(servicio.precio)
    if (!Number.isFinite(precioReal) || precioReal <= 0) {
      return NextResponse.json(
        { error: 'Precio de servicio inválido' },
        { status: 400 }
      )
    }

    if (precioCliente !== undefined && Number(precioCliente) !== precioReal) {
      return NextResponse.json(
        {
          error: 'El precio enviado no coincide con el valor real del servicio',
        },
        { status: 400 }
      )
    }

    const origin =
      req.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000'

    const preferencia = await crearPreferenciaMercadoPago({
      titulo: servicio.nombre,
      precio: precioReal,
      turnoId,
      clienteEmail: user.email ?? '',
      clienteNombre: user.user_metadata?.full_name ?? 'Cliente',
      backUrls: {
        success: `${origin}/reservar/${negocioSlug}?pago=ok&turno=${turnoId}`,
        failure: `${origin}/reservar/${negocioSlug}?pago=error&turno=${turnoId}`,
        pending: `${origin}/reservar/${negocioSlug}?pago=pendiente&turno=${turnoId}`,
      },
    })

    return NextResponse.json(
      {
        id: preferencia.id,
        url:
          process.env.NODE_ENV === 'production'
            ? preferencia.init_point
            : preferencia.sandbox_init_point,
      },
      {
        headers: {
          'X-RateLimit-Limit': String(rate.limit),
          'X-RateLimit-Remaining': String(rate.remaining),
          'X-RateLimit-Reset': String(rate.reset),
        },
      }
    )
  } catch (err) {
    console.error('[Turnly] Error checkout:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    )
  }
}
