'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RequestRow = { id: string; actor?: string; kind: 'export' | 'deletion'; status: 'pending' | 'in_review' | 'resolved'; opened_at: string }
const labels = { pending: 'Pendiente', in_review: 'En revisión', resolved: 'Resuelta' }

export default function PrivacyRequests({ support = false }: { support?: boolean }) {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.rpc(support ? 'turnly_privacy_support' : 'turnly_privacy_request').then(({ data, error }) => {
      if (!active) return
      if (error) setStatus('No se pudieron consultar las solicitudes. Verificá tu sesión.')
      else setRows(data)
    })
    return () => { active = false }
  }, [support])

  async function submit(kind?: RequestRow['kind'], row?: RequestRow) {
    setBusy(true)
    try {
      const { data, error } = support
        ? await supabase.rpc('turnly_privacy_support', { target: row?.id, next_status: row?.status === 'pending' ? 'in_review' : 'resolved' })
        : await supabase.rpc('turnly_privacy_request', { request_kind: kind })
      if (error) throw new Error()
      setRows(data)
      setStatus('Solicitud actualizada.')
    } catch { setStatus('No se pudo actualizar la solicitud.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-3xl space-y-5 p-6 text-white">
    <h1 className="text-3xl font-bold">Solicitudes de privacidad</h1>
    <p>{support ? 'Verificá identidad y alcance por el canal de soporte antes de gestionar cada caso.'
      : 'Podés solicitar la exportación o eliminación de tus datos. Cada solicitud queda sujeta a revisión.'}</p>
    {!support && <div className="flex flex-wrap gap-3">
      <button disabled={busy} className="min-h-11 underline" onClick={() => void submit('export')}>Solicitar exportación</button>
      <button disabled={busy} className="min-h-11 underline" onClick={() => void submit('deletion')}>Solicitar eliminación</button>
    </div>}
    {status && <p role="status">{status}</p>}
    <ul className="space-y-3">{rows.map(row => <li key={row.id} className="rounded border p-3">
      <p>{row.kind === 'export' ? 'Exportación' : 'Eliminación'} · {labels[row.status]} · {new Date(row.opened_at).toLocaleDateString('es-AR')}</p>
      <p className="break-all text-sm">Referencia {row.id}{support && row.actor ? ' · Cuenta ' + row.actor : ''}</p>
      {support && row.status !== 'resolved' && <button disabled={busy} className="min-h-11 underline" onClick={() => void submit(undefined, row)}>
        {row.status === 'pending' ? 'Pasar a revisión' : 'Registrar resolución del caso'}
      </button>}
    </li>)}</ul>
  </main>
}
