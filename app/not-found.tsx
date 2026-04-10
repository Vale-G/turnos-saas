import Link from 'next/link'
import { brandConfig } from '@/config/brand'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-6 text-center px-6">
      <img src={brandConfig.appLogoUrl} alt={brandConfig.appName} className="w-24 h-24 rounded-2xl object-cover border border-white/10 mb-2" />
      <p className="text-8xl font-black italic text-emerald-500">404</p>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">
        Página no encontrada
      </h1>
      <p className="text-slate-500 max-w-sm">
        Esta página no existe o fue movida.
      </p>
      <Link href="/landing"
        className="bg-emerald-500 text-black font-black uppercase italic px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity">
        Volver al inicio
      </Link>
    </div>
  )
}
