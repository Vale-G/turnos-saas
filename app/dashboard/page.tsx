'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardInicio() {
  const [color, setColor] = useState('#10b981')
  const [negocioNombre, setNegocioNombre] = useState('Mi Negocio')

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
        if (perfil?.negocio_id) {
          const { data: negocio } = await supabase.from('Negocio').select('nombre, color_primario').eq('id', perfil.negocio_id).single()
          if (negocio) {
            setNegocioNombre(negocio.nombre)
            if (negocio.color_primario) setColor(negocio.color_primario)
          }
        }
      }
    }
    cargarDatos()
  }, [])

  const modulos = [
    { name: 'Gestionar Agenda', href: '/dashboard/agenda', desc: 'Ver y crear turnos' },
    { name: 'Servicios', href: '/dashboard/servicios', desc: 'Precios y duraciones' },
    { name: 'Personal', href: '/dashboard/personal', desc: 'Tus barberos' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Panel: {negocioNombre}
        </h1>
        <p className="text-slate-400 mt-2">Acceso rápido a tus herramientas de gestión.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modulos.map((m) => (
          <Link key={m.href} href={m.href} className="group">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 hover:border-slate-600 transition-all h-full shadow-xl">
              <h3 className="text-white font-bold text-xl mb-1 group-hover:text-emerald-400" style={{ color: color }}>{m.name}</h3>
              <p className="text-slate-500 text-sm">{m.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
