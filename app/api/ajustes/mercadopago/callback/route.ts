import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'
import { exchangeAuthorizationCode, readOAuthState, storeBusinessToken } from '@/lib/server/mercadopago-oauth'

function result(request: NextRequest, status: string) {
  const response = NextResponse.redirect(new URL(`/ajustes?mp=${status}`, request.nextUrl.origin))
  response.cookies.delete('turnly_mp_oauth')
  return response
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookie = request.cookies.get('turnly_mp_oauth')?.value
  if (!code || !state || !cookie) return result(request, 'invalid')

  const oauth = readOAuthState(cookie, state)
  if (!oauth) return result(request, 'invalid')

  const userClient = await createUserServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user || user.id !== oauth.userId) return result(request, 'invalid')

  const admin = createAdminClient()
  const { data: negocio } = await admin.from('negocio').select('id').eq('id', oauth.negocioId).eq('owner_id', user.id).maybeSingle()
  if (!negocio) return result(request, 'invalid')

  try {
    const token = await exchangeAuthorizationCode(code, oauth.verifier)
    await storeBusinessToken(admin, negocio.id, token)
    return result(request, 'connected')
  } catch {
    return result(request, 'error')
  }
}
