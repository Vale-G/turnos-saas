import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ["latin"] })

// ESTO FUERZA A QUE LA PESTAÑA Y EL ACCESO DIRECTO SEAN TUYOS
export const metadata: Metadata = {
  title: "Turnly | Elite SaaS para Barberías",
  description: "El sistema de gestión y reservas definitivo para barberías y salones de lujo. by F&V Tech.",
  icons: {
    icon: "/fvtech-logo.jpg",
    shortcut: "/fvtech-logo.jpg",
    apple: "/fvtech-logo.jpg",
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
