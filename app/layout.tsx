import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Turnly by F&V Tech — Sistema de Turnos Online',
  description: 'Tus clientes reservan solos. Vos te concentrás en trabajar. Sistema de turnos online para barberías, peluquerías y más. Desarrollado por F&V Tech.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://turnos-saas-eight.vercel.app'),
  openGraph: {
    title: 'Turnly by F&V Tech — Sistema de Turnos Online',
    description: 'Tus clientes reservan solos. Vos te concentrás en trabajar.',
    type: 'website',
    images: [{ url: '/fvtech-logo.jpg', width: 1270, height: 952, alt: 'F&V Tech Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Turnly by F&V Tech',
    description: 'Sistema de turnos online para tu negocio',
    images: ['/fvtech-logo.jpg'],
  },
  icons: {
    icon: '/fvtech-logo.jpg',
    apple: '/fvtech-logo.jpg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
