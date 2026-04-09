'use client'

import { ThemeProvider } from 'next-themes'
import { brandConfig } from '@/config/brand'

export default function Providers({ children }: { children: React.ReactNode }) {
  const isLightOnly = brandConfig.themeMode === 'light-only'

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme={isLightOnly ? 'light' : undefined}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
