'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [negocio, setNegocio] = useState<any>(null)
  const [color, setColor] = useState('#10b981')
  const pathname = usePathname()

  useEffect(() => {
    async function loadBranding() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
        if (perfil?.negocio_id) {
          const { data } = await supabase.from('Negocio').select('nombre, logo_url, color_primario').eq('id', perfil.negocio_id).single()
          if (data) {
            setNegocio(data)
            if (data.color_primario) setColor(data.color_primario)
          }
        }
      }
    }
    loadBranding()
  }, [])

  const links = [
    { name: '🏠 Inicio', href: '/dashboard' },
    { name: '📅 Agenda', href: '/dashboard/agenda' },
    { name: '✂️ Servicios', href: '/dashboard/servicios' },
    { name: '👥 Personal', href: '/dashboard/personal' },
    { name: '⚙️ Configuración', href: '/dashboard/configuracion' },
  ]

  return (
    <div className="flex min-h-screen bg-[#020617] text-white">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-6">
        {/* LOGO Y NOMBRE DINÁMICOS */}
        <div className="flex items-center gap-3 px-2">
          {negocio?.logo_url ? (
            <img src={negocio.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-black">B</div>
          )}
          <span className="font-black text-sm uppercase truncate" style={{ color: color }}>
            {negocio?.nombre || 'BARBER-SAAS'}
          </span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
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
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
