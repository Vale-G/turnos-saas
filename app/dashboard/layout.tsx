'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const menu = [
    { name: 'Agenda', path: '/dashboard/agenda', icon: '📅' },
    { name: 'Servicios Pro', path: '/dashboard/servicios', icon: '✂️' },
    { name: 'Estadísticas', path: '/admin/dashboard', icon: '📈' },
    { name: 'Configuración', path: '/dashboard/configuracion', icon: '⚙️' },
  ]

  return (
    <div className="flex min-h-screen bg-black">
      {/* SIDEBAR FIJO */}
      <div className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col p-6 gap-8 fixed h-full">
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
                ? 'bg-emerald-500 text-black shadow-lg' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-900 pt-6">
           <Link href="/" className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-all">
             Cerrar Sesión
           </Link>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 ml-64 p-8">
        {children}
      </div>
    </div>
  )
}
