'use client'

import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())

  useEffect(() => {
    let active = true

    const loadTheme = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser()
        const user = auth.user
        if (!user || !active) return

        const negocioId =
          typeof window !== 'undefined' ? localStorage.getItem('nId') : null

        let tema: string | null | undefined

        if (negocioId) {
          const { data: negocioById } = await supabase
            .from('negocio')
            .select('tema')
            .eq('id', negocioId)
            .single()
          tema = negocioById?.tema
        }

        if (!tema) {
          const { data: negocioByOwner } = await supabase
            .from('negocio')
            .select('tema')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          tema = negocioByOwner?.tema
        }

        if (active) {
          setColorPrincipal(getThemeColor(tema))
        }
      } catch {
        if (active) {
          setColorPrincipal(getThemeColor())
        }
      }
    }

    loadTheme()

    return () => {
      active = false
    }
  }, [])

  const menu = [
    { name: 'Agenda', path: '/turnos', icon: '📅' },
    { name: 'Servicios', path: '/servicios', icon: '✂' },
    { name: 'Clientes', path: '/clientes', icon: '👥' },
    { name: 'Staff', path: '/staff', icon: '💈' },
    { name: 'Informes', path: '/informes', icon: '📊' },
    { name: 'Lista Negra', path: '/dashboard/lista-negra', icon: '⛔' },
    { name: 'Ajustes', path: '/ajustes', icon: '⚙' },
    { name: 'Bloqueos', path: '/bloqueos', icon: '🔒' },
  ]

  return (
    <div className="w-64 bg-slate-900 h-screen p-6 border-r border-slate-800 flex flex-col gap-8">
      <div
        className="font-black italic text-2xl tracking-tighter"
        style={{ color: colorPrincipal }}
      >
        TURNLY PRO
      </div>

      <nav className="flex flex-col gap-2">
        {menu.map((item) => {
          const isActive = pathname === item.path

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${
                isActive
                  ? 'text-black'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: colorPrincipal,
                      boxShadow: `0 10px 30px ${colorPrincipal}33`,
                    }
                  : undefined
              }
            >
              <span className="text-xl">{item.icon}</span>
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-4 bg-slate-950 rounded-2xl border border-slate-800">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">
          Plan Profesional Activo
        </p>
      </div>
    </div>
  )
}
