'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    if (password !== confirm) { setStatus('Las contraseñas deben coincidir.'); return }
    setBusy(true)
    try {
      const { data, error: authError } = await supabase.auth.getUser()
      if (authError || !data.user) { setStatus('El enlace venció. Solicitá uno nuevo.'); return }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setStatus('No se pudo actualizar. Verificá los requisitos de contraseña o solicitá otro enlace.'); return }
      setSaved(true)
      setStatus('Contraseña actualizada.')
    } catch { setStatus('No pudimos conectar. Intentá nuevamente.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-md space-y-5 p-6 text-white">
    <h1 className="text-3xl font-bold">Elegir una contraseña nueva</h1>
    {!saved && <form onSubmit={submit} className="space-y-4">
      <label htmlFor="new-password">Nueva contraseña (mínimo 8 caracteres)</label>
      <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password}
        onChange={event => setPassword(event.target.value)} className="block w-full rounded border p-3" />
      <label htmlFor="confirm-password">Repetí la contraseña</label>
      <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm}
        onChange={event => setConfirm(event.target.value)} className="block w-full rounded border p-3" />
      <button disabled={busy} className="min-h-11 rounded bg-white px-4 font-bold text-black">Actualizar contraseña</button>
    </form>}
    {status && <p role="status">{status}</p>}
    <Link href={saved ? '/dashboard' : '/recuperar'} className="underline">{saved ? 'Ir al panel' : 'Solicitar otro enlace'}</Link>
  </main>
}
