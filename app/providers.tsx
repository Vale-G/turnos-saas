'use client'

import { brandConfig } from '@/config/brand'
import { useEffect } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    if (brandConfig.themeMode === 'light-only') {
      root.classList.remove('dark')
      root.classList.add('light')
      return
    }

    const stored = localStorage.getItem('theme')
    const nextTheme = stored === 'dark' ? 'dark' : 'light'
    root.classList.toggle('dark', nextTheme === 'dark')
    root.classList.toggle('light', nextTheme === 'light')
  }, [])

  return <>{children}</>
}
