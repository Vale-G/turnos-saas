'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)
  const [color, setColor] = useState('#10b981') // Color por defecto

  useEffect(() => {
    async function getDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Traer rol y negocio_id
        const { data: perfil } = await supabase.from('perfiles').select('rol, negocio_id').eq('id', user.id).single()
        setRol(perfil?.rol || 'usuario')

        // Traer el color del negocio
        if (perfil?.negocio_id) {
          const { data: negocio } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
          if (negocio?.color_primario) setColor(negocio.color_primario)
        }
      }
    }
    getDatos()
  }, [pathname]) // Se actualiza si cambias de página

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Agregá acá los nombres de las carpetas que tenías antes (servicios, barberos, etc.)
  const links = [
    { name: '🏠 Inicio', href: '/dashboard', show: true },
    { name: '📅 Agenda', href: '/dashboard/agenda', show: rol !== 'superadmin' },
    { name: '✂️ Servicios', href: '/dashboard/servicios', show: rol !== 'superadmin' },
    { name: '👥 Personal', href: '/dashboard/personal', show: rol !== 'superadmin' },
    { name: '⚙️ Configuración', href: '/dashboard/configuracion', show: rol !== 'superadmin' },
    { name: '👑 Superadmin', href: '/dashboard/superadmin', show: rol === 'superadmin' },
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-white font-sans">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col">
        <div className="font-black text-2xl italic mb-10 tracking-tighter" style={{ color: color }}>
          BARBER-SAAS
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {links.filter(l => l.show).map((link) => {
            const isActive = pathname === link.href
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive ? 'shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-800'
                }`}
                style={isActive ? { backgroundColor: color, color: '#000' } : {}}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto px-4 py-3 text-left text-slate-500 text-sm font-bold hover:text-red-400 transition-colors border-t border-slate-800 pt-6"
        >
          🚪 Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
