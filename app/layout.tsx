import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Toaster } from 'sonner'
import { brandConfig } from '@/config/brand'
import Providers from './providers'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: `${brandConfig.appName} | SaaS de Gestión para Barberías`,
  description: `${brandConfig.appName}: software de reservas y control financiero.`,
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📅</text></svg>",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: brandConfig.brandColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="min-h-screen bg-white text-slate-900 selection:bg-emerald-500/30 dark:bg-[#020617] dark:text-white"
        style={{ ['--brand-color' as string]: brandConfig.brandColor }}
      >
        <Providers>
          <ThemeToggle />
          {children}
          <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' } }} />
        </Providers>
      </body>
    </html>
  )
}
