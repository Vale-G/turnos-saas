'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)

  useEffect(() => {
    async function getPerfil() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
        setRol(data?.rol || 'usuario')
      }
    }
    getPerfil()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { name: '🏠 Inicio', href: '/dashboard', show: true },
    { name: '⚙️ Configuración', href: '/dashboard/configuracion', show: rol !== 'superadmin' },
    { name: '👑 Panel Superadmin', href: '/dashboard/superadmin', show: rol === 'superadmin' },
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col">
        <div className="text-emerald-500 font-black text-xl italic mb-8">BARBER-SAAS</div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {links.filter(l => l.show).map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                pathname === link.href ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto px-4 py-3 text-left text-slate-500 text-sm font-bold hover:text-red-400 transition-colors"
        >
          🚪 Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
