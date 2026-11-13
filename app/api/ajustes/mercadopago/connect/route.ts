import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { createAuthorizationUrl, createOAuthState } from '@/lib/server/mercadopago-oauth'

export async function GET(request: NextRequest) {
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
  } catch (error) {
    console.error('[Turnly] No se pudo iniciar Mercado Pago OAuth', error instanceof Error ? error.message : 'Error desconocido')
    return NextResponse.redirect(new URL('/ajustes?mp=not-configured', request.nextUrl.origin))
  }
}
