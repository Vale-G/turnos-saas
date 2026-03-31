import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Turnly | SaaS de Gestión para Barberías",
  description: "El software de reservas y control financiero definitivo.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📅</text></svg>",
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#020617] text-white min-h-screen selection:bg-emerald-500/30`}>
        {children}
        <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' } }} />
      </body>
    </html>
  )
}
