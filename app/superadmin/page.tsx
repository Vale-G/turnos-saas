'use client'

import { useState } from 'react'
import { planNames, stateNames, type SubscriptionSummary } from '@/lib/commercial-subscription'

type Support = SubscriptionSummary & { audit: { id: number; event: string; at: string; detail: { note?: string } }[] }

export default function SubscriptionSupport() {
  const [business, setBusiness] = useState('')
  const [incident, setIncident] = useState('')
  const [summary, setSummary] = useState<Support | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(note?: string) {
    setBusy(true)
    setError('')
    setSummary(null)
    try {
      const response = note ? await fetch('/api/superadmin/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ negocioId: business.trim(), incident: note }),
      }) : await fetch('/api/superadmin/plan?negocioId=' + encodeURIComponent(business.trim()), { cache: 'no-store' })
      if (!response.ok) throw new Error()
      setSummary(await response.json())
      if (note) setIncident('')
    } catch { setError('Verificá el ID del comercio y el permiso de soporte.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-3xl space-y-5 p-6 text-white">
    <h1 className="text-3xl font-bold">Soporte de suscripciones</h1>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit() }}>
      <label htmlFor="commercial-business">ID del comercio</label>
      <input id="commercial-business" className="block w-full rounded border p-2" value={business}
        onChange={event => { setBusiness(event.target.value); setSummary(null) }} required />
      <button className="min-h-11 underline" disabled={busy}>Consultar</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {summary && <section className="space-y-3">
      <h2 className="text-xl font-bold">{stateNames[summary.state]}</h2>
      <p>Plan: {summary.plan ? planNames[summary.plan] : 'Sin contratación'}</p>
      <p>Vencimiento: {summary.periodEnd ?? summary.trialEnd ?? 'Sin fecha asociada'}</p>
      <p>Pagos registrados: {summary.payments.length}</p>
      <form className="space-y-2" onSubmit={event => { event.preventDefault(); void submit(incident.trim()) }}>
        <label htmlFor="commercial-incident">Nota de incidencia</label>
        <textarea id="commercial-incident" className="block w-full rounded border p-2" minLength={4} maxLength={500}
          required value={incident} onChange={event => setIncident(event.target.value)} />
        <button className="min-h-11 underline" disabled={busy}>Guardar nota auditada</button>
      </form>
      <h3 className="font-bold">Actividad</h3>
      <ul>{summary.audit.map(entry => <li key={entry.id}>{new Date(entry.at).toLocaleString('es-AR')} · {entry.event} {entry.detail.note}</li>)}</ul>
    </section>}
  </main>
}
