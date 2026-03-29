import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Turnly — Reservas para tu negocio',
  description: 'Tus clientes reservan solos. Vos te concentrás en trabajar. Sistema de turnos online para barberías, peluquerías y más.',
  openGraph: {
    title: 'Turnly by F&V Tech',
    description: 'Tus turnos, tu negocio.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Link
          href="/"
          className="fixed top-3 left-3 z-[60] flex items-center gap-2 rounded-xl border border-white/10 bg-[#020617]/80 px-2.5 py-1.5 backdrop-blur-md hover:border-white/20 transition-colors"
        >
          <Image src="/fv-tech-logo.svg" alt="F&V TECH" width={72} height={24} className="h-5 w-auto" priority />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">F&amp;V TECH</span>
        </Link>
        {children}
      </body>
    </html>
  )
}
