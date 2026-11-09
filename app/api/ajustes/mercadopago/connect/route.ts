import { NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { createAuthorizationUrl, createOAuthState } from '@/lib/server/mercadopago-oauth'

export async function GET() {
  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: negocio } = await admin.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
  if (!negocio) return NextResponse.json({ error: 'Solo el propietario puede conectar Mercado Pago' }, { status: 403 })

  try {
    const oauth = createOAuthState(negocio.id, user.id)
    const response = NextResponse.redirect(createAuthorizationUrl(oauth.state, oauth.challenge))
    response.cookies.set('turnly_mp_oauth', oauth.cookie, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/api/ajustes/mercadopago/callback', maxAge: 10 * 60,
    })
    return response
  } catch {
    return NextResponse.redirect(new URL('/ajustes?mp=not-configured', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
  }
}
