'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getOAuthRedirectUrl, supabase } from '@/lib/supabase'

export default function RecoveryRequest() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getOAuthRedirectUrl('/auth/callback?next=/recuperar/restablecer'),
      })
    } catch {
      // Give the same result for unknown accounts and network/provider errors.
    } finally { setSent(true); setBusy(false) }
  }
  return <main className="mx-auto max-w-md space-y-5 p-6 text-white">
    <h1 className="text-3xl font-bold">Recuperar contraseña</h1>
    <form onSubmit={submit} className="space-y-4">
      <label htmlFor="recovery-email">Correo de la cuenta</label>
      <input id="recovery-email" type="email" autoComplete="email" required value={email}
        onChange={event => setEmail(event.target.value)} className="block w-full rounded border p-3" />
      <button disabled={busy || sent} className="min-h-11 rounded bg-white px-4 font-bold text-black">Enviar enlace</button>
    </form>
    {sent && <p role="status">Si el correo está registrado, vas a recibir un enlace. Revisá correo no deseado y esperá antes de volver a intentar.</p>}
    <Link href="/login" className="underline">Volver a iniciar sesión</Link>
  </main>
}
