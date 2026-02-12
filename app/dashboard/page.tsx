'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardInicio() {
  const [stats, setStats] = useState({ turnos: 0, clientes: 0, ingresos: 0 })
  const [negocioNombre, setNegocioNombre] = useState('Mi Negocio')

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Traer nombre del negocio
        const { data: negocio } = await supabase
          .from('Negocio')
          .select('nombre')
          .eq('dueno_id', user.id)
          .single()
        
        if (negocio) setNegocioNombre(negocio.nombre)
        
        // Aquí podrías cargar estadísticas reales de tus tablas de Turnos
        setStats({ turnos: 12, clientes: 45, ingresos: 15000 })
      }
    }
    cargarDatos()
  }, [])

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
          Bienvenido, {negocioNombre}
        </h1>
        <p className="text-slate-400">Esto es lo que está pasando en tu barbería hoy.</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2">Turnos Hoy</p>
          <p className="text-4xl font-black text-emerald-500">{stats.turnos}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2">Clientes Totales</p>
          <p className="text-4xl font-black text-blue-500">{stats.clientes}</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-slate-500 text-xs font-bold uppercase mb-2">Recaudación Est.</p>
          <p className="text-4xl font-black text-orange-500">${stats.ingresos}</p>
        </div>
      </div>

      {/* Espacio para Próximos Turnos */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
        <h2 className="text-xl font-bold text-white mb-4">Próximos Turnos</h2>
        <div className="text-slate-500 text-sm italic">
          No hay más turnos agendados para las próximas horas.
        </div>
      </div>
    </div>
  )
}
