'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useSyncExternalStore } from 'react'

const preferenceKey = 'turnly-product-appearance'
const appearanceEvent = 'turnly:appearance'
type Preference = 'system' | 'light' | 'dark'
let fallback: Preference = 'system'

function preference(): Preference {
  try {
    const item = localStorage.getItem(preferenceKey)
    if (item === 'light' || item === 'dark' || item === 'system') return item
  } catch {}
  return fallback
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(appearanceEvent, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(appearanceEvent, listener)
  }
}

export function AppearancePicker() {
  const mode = useSyncExternalStore(subscribe, preference, () => 'system' as Preference)
  const id = useId()
  return <div className="flex items-center gap-2 text-sm text-product-muted">
    <label htmlFor={id}>Apariencia</label>
    <select id={id} value={mode} className="product-field min-h-11" onChange={event => {
      const next = event.target.value as Preference
      fallback = next
      try { localStorage.setItem(preferenceKey, next) } catch {}
      window.dispatchEvent(new Event(appearanceEvent))
    }}>
      <option value="system">Automática</option>
      <option value="light">Clara</option>
      <option value="dark">Oscura</option>
    </select>
  </div>
}

const links = [
  ['/dashboard', 'Hoy'], ['/turnos', 'Agenda'], ['/clientes', 'Clientes'],
  ['/servicios', 'Servicios'], ['/staff', 'Equipo'], ['/caja', 'Caja'],
  ['/informes', 'Insights'], ['/ajustes', 'Configuración'], ['/upgrade', 'Suscripción'],
] as const

export default function ProductAppearance({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mode = useSyncExternalStore(subscribe, preference, () => 'system' as Preference)
  useEffect(() => { document.documentElement.dataset.productTheme = mode }, [mode])
  const inPanel = [...links.map(([path]) => path), '/bloqueos'].some(path =>
    pathname === path || pathname.startsWith(path + '/'))
  if (!inPanel) return children

  return <div className="product-shell min-h-screen lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
    <aside className="border-b border-product-line bg-product-surface px-4 py-3 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-7 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 lg:mb-6 lg:grid lg:justify-start">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-product-accent">Turnly</Link>
        <AppearancePicker />
      </div>
      <nav aria-label="Panel de Turnly" className="mt-2 flex gap-1 overflow-x-auto lg:grid">
        {links.map(([path, label]) => (
          <Link key={path} href={path} aria-current={pathname === path ? 'page' : undefined}
            className="product-nav-link flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm">{label}</Link>
        ))}
      </nav>
    </aside>
    <div className="min-w-0">{children}</div>
  </div>
}
