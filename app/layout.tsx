import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/header'
import { Toaster } from 'sonner'
import Providers from './providers'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Turnos | SaaS de Gestión para Barberías',
  description: 'Software de reservas y control financiero.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📅</text></svg>",
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} min-h-screen bg-white text-slate-900 selection:bg-emerald-500/30 dark:bg-[#020617] dark:text-white`}
      >
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
          <Toaster
            theme="dark"
            position="top-center"
            richColors
            toastOptions={{
              style: {
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}