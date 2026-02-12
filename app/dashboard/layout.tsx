'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [negocio, setNegocio] = useState<any>(null)
  const [rol, setRol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Intentar traer perfil y negocio
      const { data: perfil } = await supabase.from('perfiles').select('rol, negocio_id').eq('id', user.id).single()
      setRol(perfil?.rol || 'usuario')

      if (perfil?.negocio_id) {
        const { data: neg } = await supabase.from('Negocio').select('nombre, color_primario, logo_url').eq('id', perfil.negocio_id).single()
        setNegocio(neg)
      }
      setLoading(false)
    }
    loadData()
  }, [pathname, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const color = negocio?.color_primario || '#10b981'

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-emerald-500 flex-shrink-0" />
            <span className="font-black uppercase tracking-tighter truncate">
              {negocio?.nombre || 'BARBER-SAAS'}
            </span>
          </div>

          <nav className="flex flex-col gap-2">
            <Link href="/dashboard" className={`p-3 rounded-xl text-sm font-bold ${pathname === '/dashboard' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>🏠 Inicio</Link>
            
            {/* Si es Superadmin, mostramos su panel */}
            {rol === 'superadmin' && (
              <Link href="/dashboard/superadmin" className={`p-3 rounded-xl text-sm font-bold ${pathname === '/dashboard/superadmin' ? 'bg-emerald-500 text-black' : 'text-emerald-500/50 hover:text-emerald-400'}`}>👑 Superadmin</Link>
            )}

            {/* Opciones normales de Dueño */}
            {rol !== 'superadmin' && (
              <>
                <Link href="/dashboard/agenda" className="p-3 text-slate-500 font-bold text-sm">📅 Agenda</Link>
                <Link href="/dashboard/staff" className="p-3 text-slate-500 font-bold text-sm text-white">👥 Equipo</Link>
                <Link href="/dashboard/servicios" className="p-3 text-slate-500 font-bold text-sm">✂️ Servicios</Link>
                <Link href="/dashboard/configuracion" className="p-3 text-slate-500 font-bold text-sm">⚙️ Configuración</Link>
              </>
            )}
          </nav>
        </div>

        {/* BOTÓN DE CERRAR SESIÓN (SIEMPRE VISIBLE) */}
        <button 
          onClick={handleLogout}
          className="p-4 text-left text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors border-t border-slate-800"
        >
          🚪 Cerrar Sesión
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
