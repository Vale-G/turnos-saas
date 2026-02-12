'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const links = [
    { name: '🏠 Inicio', href: '/dashboard' },
    { name: '⚙️ Configuración', href: '/dashboard/configuracion' },
  ]

  return (
    <div className="flex min-h-screen bg-[#020617]">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-8">
        <div className="text-emerald-500 font-black text-xl italic tracking-tighter">
          BARBER-SAAS
        </div>
        
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                pathname === link.href 
                ? 'bg-emerald-500 text-black' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <Link href="/login" className="text-slate-500 text-xs hover:text-red-400 transition-colors">
            🚪 Cerrar Sesión
          </Link>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
