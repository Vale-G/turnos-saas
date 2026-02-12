'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)
  const [color, setColor] = useState('#10b981')

  useEffect(() => {
    async function getDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase.from('perfiles').select('rol, negocio_id').eq('id', user.id).single()
        setRol(perfil?.rol || 'usuario')
        if (perfil?.negocio_id) {
          const { data: negocio } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
          if (negocio?.color_primario) setColor(negocio.color_primario)
        }
      }
    }
    getDatos()
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { name: '🏠 Inicio', href: '/dashboard', show: true },
    { name: '📅 Agenda', href: '/dashboard/agenda', show: rol !== 'superadmin' },
    { name: '✂️ Servicios', href: '/dashboard/servicios', show: rol !== 'superadmin' },
    { name: '👥 Personal', href: '/dashboard/personal', show: rol !== 'superadmin' },
    { name: '⚙️ Configuración', href: '/dashboard/configuracion', show: rol !== 'superadmin' },
    { name: '👑 Superadmin', href: '/dashboard/superadmin', show: rol === 'superadmin' },
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col">
        <div className="font-black text-2xl italic mb-10" style={{ color: color }}>BARBER-SAAS</div>
        <nav className="flex flex-col gap-2 flex-1">
          {links.filter(l => l.show).map((link) => (
            <Link key={link.href} href={link.href}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                pathname === link.href ? 'text-black' : 'text-slate-400 hover:bg-slate-800'
              }`}
              style={pathname === link.href ? { backgroundColor: color } : {}}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-auto px-4 py-3 text-left text-slate-500 text-sm font-bold hover:text-red-400 transition-colors border-t border-slate-800 pt-6">
          🚪 Cerrar Sesión
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
