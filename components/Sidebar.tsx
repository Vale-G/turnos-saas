'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const menu = [
    { name: 'Agenda', path: '/turnos', icon: '📅' },
    { name: 'Servicios', path: '/servicios', icon: '✂' },
    { name: 'Clientes', path: '/clientes', icon: '👥' },
    { name: 'Staff', path: '/staff', icon: '💈' },
    { name: 'Informes', path: '/informes', icon: '📊' },
    { name: 'Ajustes', path: '/ajustes', icon: '⚙' },
    { name: 'Bloqueos', path: '/bloqueos', icon: '🔒' },
  ]

  return (
    <div className="w-64 bg-slate-900 h-screen p-6 border-r border-slate-800 flex flex-col gap-8">
      <div className="text-emerald-500 font-black italic text-2xl tracking-tighter">TURNLY PRO</div>

      <nav className="flex flex-col gap-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
              pathname === item.path
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-950 rounded-2xl border border-slate-800">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">
          Plan Profesional Activo
        </p>
      </div>
    </div>
  )
}
