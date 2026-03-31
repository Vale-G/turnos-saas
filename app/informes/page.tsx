'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type StatTurno = {
  fecha: string; estado: string; pago_estado: string | null; pago_tipo: string | null
  servicio?: { nombre: string; precio: number }
  staff?: { nombre: string }
}

export default function InformesPro() {
  const [turnos, setTurnos] = useState<StatTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState<any>(null)
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: neg } = await supabase.from('negocio').select('*').eq('owner_id', user.id).single()
      if (!neg) return router.push('/onboarding')
      if (neg.suscripcion_tipo !== 'pro' && neg.suscripcion_tipo !== 'trial') return router.push('/dashboard')
      setNegocio(neg)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id) return
    async function cargar() {
      setLoading(true)
      const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
      const desde = new Date(); desde.setDate(desde.getDate() - dias)
      
      const { data } = await supabase.from('turno')
        .select('fecha, estado, pago_estado, pago_tipo, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocio.id)
        .gte('fecha', desde.toISOString().split('T')[0])
        .order('fecha', { ascending: true })

      setTurnos((data as any[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [negocio, periodo])

  const stats = useMemo(() => {
    const cobrados = turnos.filter(t => t.pago_estado === 'cobrado')
    const activos = turnos.filter(t => t.estado !== 'cancelado')
    const total = cobrados.reduce((acc, t) => acc + (t.servicio?.precio ?? 0), 0)
    
    const servicios: Record<string, number> = {}
    activos.forEach(t => { const n = t.servicio?.nombre ?? 'Otro'; servicios[n] = (servicios[n] ?? 0) + 1 })
    
    const staff: Record<string, number> = {}
    activos.forEach(t => { const n = t.staff?.nombre ?? 'Sin asignar'; staff[n] = (staff[n] ?? 0) + 1 })

    const ingresosPorDia: Record<string, number> = {}
    cobrados.forEach(t => { ingresosPorDia[t.fecha] = (ingresosPorDia[t.fecha] ?? 0) + (t.servicio?.precio ?? 0) })

    return {
      total,
      cantidad: activos.length,
      ticket: cobrados.length ? total / cobrados.length : 0,
      cancelados: turnos.length - activos.length,
      topServicios: Object.entries(servicios).sort((a,b) => b[1]-a[1]).slice(0,4),
      topStaff: Object.entries(staff).sort((a,b) => b[1]-a[1]),
      chartData: Object.entries(ingresosPorDia).sort((a,b) => a[0].localeCompare(b[0]))
    }
  }, [turnos])

  const colorP = getThemeColor(negocio?.tema)
  const maxMonto = Math.max(...stats.chartData.map(d => d[1]), 1)

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Métricas <span style={{color: colorP}}>PRO</span></h1>
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${periodo === p ? 'text-black' : 'text-slate-400'}`} style={periodo === p ? {backgroundColor: colorP} : {}}>{p === '7d' ? 'Semana' : p === '30d' ? 'Mes' : 'Trimestre'}</button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-[2rem]" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Facturación', value: `$${stats.total.toLocaleString()}`, color: 'text-emerald-400' },
                { label: 'Turnos', value: stats.cantidad, color: 'text-white' },
                { label: 'Ticket Promedio', value: `$${Math.round(stats.ticket).toLocaleString()}`, color: 'text-white' },
                { label: 'Cancelados', value: stats.cancelados, color: 'text-rose-500' },
              ].map(k => (
                <div key={k.label} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">{k.label}</p>
                  <p className={`text-3xl font-black italic ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico de Ingresos */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-8">Flujo de Ingresos Diarios</p>
              <div className="flex items-end gap-1.5 h-32">
                {stats.chartData.map(([fecha, monto]) => (
                  <div key={fecha} className="flex-1 group relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      ${monto.toLocaleString()}
                    </div>
                    <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: (monto/maxMonto * 100) + '%', backgroundColor: colorP, opacity: 0.3 + (monto/maxMonto * 0.7) }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ranking de Servicios */}
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-8">Top Servicios</p>
                <div className="space-y-6">
                  {stats.topServicios.map(([nombre, cant]) => (
                    <div key={nombre}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black uppercase italic">{nombre}</span>
                        <span className="text-xs font-black" style={{color: colorP}}>{cant} turnos</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: (cant / stats.topServicios[0][1] * 100) + '%', backgroundColor: colorP }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking Staff */}
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-8">Rendimiento Staff</p>
                <div className="space-y-4">
                  {stats.topStaff.map(([nombre, cant]) => (
                    <div key={nombre} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs" style={{backgroundColor: colorP + '20', color: colorP}}>{nombre[0]}</div>
                        <span className="text-xs font-black uppercase">{nombre}</span>
                      </div>
                      <span className="text-sm font-black italic">{cant} turnos</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
