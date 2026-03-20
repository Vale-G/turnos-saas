import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Solo aplicar en rutas de reserva pública
  if (!pathname.startsWith('/reservar/')) {
    return NextResponse.next()
  }

  const slug = pathname.split('/')[2]
  if (!slug) return NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: negocio } = await supabase
    .from('Negocio')
    .select('activo')
    .eq('slug', slug)
    .single()

  // Si el negocio está inactivo, mostrar página de error
  if (negocio && negocio.activo === false) {
    return NextResponse.rewrite(new URL('/negocio-inactivo', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/reservar/:slug*'],
}
