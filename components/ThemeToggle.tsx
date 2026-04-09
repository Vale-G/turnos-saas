'use client'

import { useTheme } from 'next-themes'
import { brandConfig } from '@/config/brand'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  if (brandConfig.themeMode !== 'with-toggle') return null

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="fixed right-4 top-4 z-50 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-md hover:scale-105 dark:border-white/15 dark:bg-slate-900 dark:text-white"
      aria-label="Cambiar tema"
    >
      {isDark ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}
