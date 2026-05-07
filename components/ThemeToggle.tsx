'use client'

import { brandConfig } from '@/config/brand'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  if (brandConfig.themeMode !== 'with-toggle') return null

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-50 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-md hover:scale-105 dark:border-white/15 dark:bg-slate-900 dark:text-white"
      aria-label="Cambiar tema"
    >
      {isDark ? '☀️ Claro' : '🌙 Oscuro'}
    </button>
  )
}
