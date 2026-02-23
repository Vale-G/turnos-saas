'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const menu = [
    { name: 'Agenda', path: '/dashboard/agenda', icon: '📅' },
    { name: 'Peluqueros', path: '/dashboard/staff', icon: '💈' },
    { name: 'Servicios', path: '/dashboard/servicios', icon: '✂️' },
    { name: 'Configuración', path: '/dashboard/configuracion', icon: '⚙️' }
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="w-64 bg-slate-950 border-r border-slate-900 fixed h-full p-6 flex flex-col gap-10 z-50">
        <div className="text-emerald-500 font-black italic text-2xl tracking-tighter border-b border-slate-900 pb-4">
          BARBUCHO <span className="text-white">PRO</span>
        </div>
        <nav className="flex flex-col gap-3">
          {menu.map((item) => (
            <Link key={item.path} href={item.path} className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${pathname === item.path ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm uppercase tracking-widest">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 ml-64 p-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-[#020617]">
        {children}
      </main>
    </div>
  )
}
