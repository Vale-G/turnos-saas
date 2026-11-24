'use client'

import { useEffect, useState } from 'react'
import { planNames, stateNames, type SubscriptionSummary } from '@/lib/commercial-subscription'
import { supabase } from '@/lib/supabase'

type Row = { id: string; nombre: string; slug: string; activo: boolean; state: SubscriptionSummary['state'] | null; effective_plan: SubscriptionSummary['effectivePlan'] }
type Filters = { query: string; lifecycle: string; activity: string; page: number }
const initial: Filters = { query: '', lifecycle: '', activity: '', page: 0 }

export default function SuperadminDirectory({ onSelect }: { onSelect: (id: string) => void }) {
  const [input, setInput] = useState(initial)
  const [filters, setFilters] = useState(initial)
  const [snapshot, setSnapshot] = useState<{ filters: Filters; rows: Row[]; hasMore: boolean; error: boolean } | null>(null)
  const current = snapshot?.filters === filters ? snapshot : null

  useEffect(() => {
    const abort = new AbortController()
    supabase.rpc('turnly_superadmin_directory', { query: filters.query.trim(), lifecycle: filters.lifecycle || null,
      active_only: filters.activity === '' ? null : filters.activity === 'active', page: filters.page })
      .abortSignal(abort.signal).then(({ data, error }) => {
        if (!abort.signal.aborted) setSnapshot({ filters, rows: data?.rows ?? [], hasMore: data?.hasMore ?? false, error: Boolean(error) })
      })
    return () => abort.abort()
  }, [filters])

  return <section className="product-card space-y-4 p-4 sm:p-6">
    <h2 className="text-xl font-semibold">Directorio de comercios</h2>
    <form onSubmit={event => { event.preventDefault(); setFilters({ ...input, page: 0 }) }} className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Comercio, ID o correo exacto del titular
        <input type="search" maxLength={120} className="product-field min-h-11" value={input.query}
          onChange={e => setInput({ ...input, query: e.target.value })} />
      </label>
      <label className="grid gap-1 text-sm">Suscripción
        <select className="product-field min-h-11" value={input.lifecycle} onChange={e => setInput({ ...input, lifecycle: e.target.value })}>
          <option value="">Todos los estados</option>
          {Object.entries(stateNames).map(([key,name]) => <option key={key} value={key}>{name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">Estado del comercio
        <select className="product-field min-h-11" value={input.activity} onChange={e => setInput({ ...input, activity: e.target.value })}>
          <option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
        </select>
      </label>
      <button className="product-action self-end" type="submit">Buscar comercios</button>
    </form>
    {!current ? <p role="status">Consultando comercios…</p> : current.error ? <p role="alert">No pudimos consultar el directorio. Verificá tu acceso administrativo o reintentá.</p> :
      current.rows.length === 0 ? <p role="status">No encontramos comercios con esos filtros.</p> :
      <ul className="divide-y divide-product-line">
        {current.rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="break-words font-semibold">{row.nombre}</p><p className="text-sm text-product-muted">
            {row.activo ? 'Activo' : 'Inactivo'} · {row.state ? stateNames[row.state] : 'Sin registro comercial'} · {row.effective_plan ? planNames[row.effective_plan] : 'Sin acceso vigente'}
          </p></div>
          <button onClick={() => onSelect(row.id)} className="min-h-11 px-2 underline" type="button">Ver detalle</button>
        </li>)}
      </ul>}
    <div className="flex flex-wrap items-center gap-3">
      <button className="min-h-11 underline disabled:opacity-50" type="button" disabled={filters.page === 0 || !current}
        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Anterior</button>
      <span aria-live="polite">Página {filters.page + 1}</span>
      <button className="min-h-11 underline disabled:opacity-50" type="button" disabled={!current?.hasMore || filters.page >= 2000}
        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Siguiente</button>
    </div>
  </section>
}
