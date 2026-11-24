import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requested = searchParams.get('next') ?? ''
  const next = requested === '/onboarding' || requested === '/recuperar/restablecer' || /^\/reservar\/[a-z0-9-]+$/i.test(requested)
    ? requested : '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
            try {
              toSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              /* Server Component — ignorar */
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
