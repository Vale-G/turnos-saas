'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Rutas ajustadas a tus carpetas reales
  const menu = [
    { name: 'Agenda', path: '/dashboard/agenda', icon: '📅' },
    { name: 'Peluqueros', path: '/dashboard/personal', icon: '💈' }, // Cambiado a /personal
    { name: 'Servicios', path: '/dashboard/servicios', icon: '✂️' },
    { name: 'Negocio', path: '/dashboard/configuracion', icon: '⚙️' }
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-200">
      <aside className="w-64 bg-slate-950 border-r border-slate-900 fixed h-full p-6 flex flex-col z-50">
        <div className="mb-10 px-2">
          <h1 className="text-emerald-500 font-black italic text-2xl tracking-tighter">BARBUCHO <span className="text-white">PRO</span></h1>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.3em]">Management System</p>
        </div>
        <nav className="flex flex-col gap-2">
          {menu.map((item) => (
            <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 ${pathname === item.path ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs uppercase tracking-widest">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-900 px-2">
          <Link href="/" className="text-[10px] font-black text-slate-600 hover:text-red-400 transition-colors uppercase italic text-center block">Salir del Panel</Link>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-10 min-h-screen">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
