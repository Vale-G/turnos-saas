'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Rutas corregidas para que coincidan con tus archivos
  const menu = [
    { name: 'Agenda', path: '/dashboard/agenda', icon: '📅' },
    { name: 'Servicios', path: '/dashboard/servicios', icon: '✂️' },
    { name: 'Negocio', path: '/dashboard/configuracion', icon: '⚙️' },
    { name: 'Métricas', path: '/admin/dashboard', icon: '📈' },
  ]

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar con diseño Barbucho */}
      <div className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col p-6 gap-8 fixed h-full z-50">
        <div className="text-emerald-500 font-black italic text-2xl tracking-tighter">
          BARBUCHO <span className="text-white">PRO</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {menu.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
                pathname === item.path 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm uppercase tracking-tighter">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-900 pt-6">
           <Link href="/" className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white">
             Volver al Inicio
           </Link>
        </div>
      </div>

      {/* Este 'children' es vital: permite que lo que ya tenías se vea */}
      <div className="flex-1 ml-64 p-8 min-h-screen relative">
        {children}
      </div>
    </div>
  )
}
