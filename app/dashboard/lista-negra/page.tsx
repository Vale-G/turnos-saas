'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const endpoint = '/api/clientes/config'

export default function ListaNegraPage() {
  const [items, setItems] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(endpoint + '?kind=blacklist', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error()
        const { value } = await response.json()
        setItems(value)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('No se pudo cargar la lista de números bloqueados.')
      })
    return () => controller.abort()
  }, [])

  async function unblock(phone: string) {
    if (!items || saving) return
    setSaving(true)
    setError(null)
    const next = items.filter(item => item !== phone)
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'blacklist', value: next, previous: items }),
      })
      if (response.status === 409) {
        setError('La lista cambió. Recargá la página antes de editarla.')
        return
      }
      if (!response.ok) throw new Error()
      setItems(next)
    } catch {
      setError('No se pudo desbloquear el número. Intentá nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 text-white">
      <Link href="/clientes" className="underline">Volver a clientes</Link>
      <h1 className="text-3xl font-bold">Lista negra</h1>
      {error && <p role="alert">{error}</p>}
      {!items && !error && <p role="status">Cargando lista…</p>}
      {items?.length === 0 && <p>No hay números bloqueados.</p>}
      {items && <ul className="space-y-3">
        {Array.from(new Set(items)).map(phone => (
          <li key={phone} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-600 p-3">
            <span>{phone}</span>
            <button type="button" disabled={saving} aria-label={`Desbloquear ${phone}`}
              className="min-h-11 px-3 underline disabled:opacity-50" onClick={() => void unblock(phone)}>Desbloquear</button>
          </li>
        ))}
      </ul>}
    </main>
  )
}
