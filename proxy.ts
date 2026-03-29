import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const SUPERADMIN_EMAILS = ['valepro50020@gmail.com']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  if (pathname.startsWith('/superadmin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    const isWhitelistedEmail = SUPERADMIN_EMAILS.includes((user.email ?? '').toLowerCase())
    const { data: admin } = await supabase
      .from('adminrol')
      .select('rol')
      .eq('user_id', user.id)
      .single()
    const isSuperadminByRole = admin?.rol === 'superadmin'

    if (!isWhitelistedEmail && !isSuperadminByRole) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith('/reservar/')) {
    return NextResponse.next()
  }

  const slug = pathname.split('/')[2]
  if (!slug) return NextResponse.next()

  const { data: negocio } = await supabase
    .from('negocio')
    .select('activo')
    .eq('slug', slug)
    .single()

  if (negocio && negocio.activo === false) {
    return NextResponse.rewrite(new URL('/negocio-inactivo', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/reservar/:slug*', '/superadmin/:path*'],
}
