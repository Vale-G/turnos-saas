'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

export default function InformesPro() {
  const [turnos, setTurnos] = useState<any[]>([])
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
      setNegocio(neg)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id) return
    async function cargar() {
      setLoading(true)
      const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)
      
      // Consultas en minúsculas para evitar errores 400
      const { data } = await supabase.from('turno')
        .select('fecha, estado, pago_estado, servicio(precio), staff(nombre)')
        .eq('negocio_id', negocio.id)
        .gte('fecha', desde.toISOString().split('T')[0])
        .order('fecha', { ascending: true })
      
      setTurnos(data ?? [])
      setLoading(false)
    }
    cargar()
  }, [negocio, periodo])

  const colorP = getThemeColor(negocio?.tema)

  const stats = useMemo(() => {
    const cobrados = turnos.filter(t => t.pago_estado === 'cobrado')
    const total = cobrados.reduce((acc, t) => acc + (t.servicio?.precio ?? 0), 0)

    // FIX: Normalización de fechas para el gráfico
    const ingresosMap: Record<string, number> = {}
    cobrados.forEach(t => {
      const f = t.fecha.split('T')[0]
      ingresosMap[f] = (ingresosMap[f] ?? 0) + (t.servicio?.precio ?? 0)
    })

    const staffMap: Record<string, number> = {}
    turnos.filter(t => t.estado !== 'cancelado').forEach(t => {
      const n = t.staff?.nombre ?? 'Sin asignar'
      staffMap[n] = (staffMap[n] ?? 0) + 1
    })

    return {
      total,
      cantidad: turnos.filter(t => t.estado !== 'cancelado').length,
      cancelados: turnos.filter(t => t.estado === 'cancelado').length,
      ticket: cobrados.length ? total / cobrados.length : 0,
      chartData: Object.entries(ingresosMap).sort((a, b) => a[0].localeCompare(b[0])),
      staffData: Object.entries(staffMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
    }
  }, [turnos])

  const maxBarra = Math.max(...stats.chartData.map(d => d[1]), 1)

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="font-black italic uppercase text-2xl text-white animate-pulse tracking-tighter">
        ANALIZANDO DATOS...
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">

        {/* Header Elite */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">
              ← Dashboard
            </button>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none">
              Métricas <span style={{ color: colorP }}>PRO</span>
            </h1>
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${periodo === p ? 'text-black' : 'text-slate-500'}`}
                style={periodo === p ? { backgroundColor: colorP } : {}}>
                {p === '7d' ? '7 Días' : p === '30d' ? '30 Días' : '90 Días'}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-8">

          {/* KPIs Luxury */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-40 h-40 blur-[100px] opacity-20 transition-opacity group-hover:opacity-30" style={{ backgroundColor: colorP }} />
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Ingresos Cobrados</p>
              <p className="text-5xl font-black italic text-emerald-400">${stats.total.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem]">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Turnos Activos</p>
              <p className="text-5xl font-black italic">{stats.cantidad}</p>
              {stats.cancelados > 0 && (
                <p className="text-[9px] font-black uppercase text-rose-500 mt-2 tracking-widest">{stats.cancelados} cancelados</p>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem]">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Ticket Promedio</p>
              <p className="text-5xl font-black italic" style={{ color: colorP }}>
                ${Math.round(stats.ticket).toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          {/* Gráfico de Tendencia Elite */}
          <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-12 tracking-[0.3em] text-center">
              Tendencia de Ingresos
            </p>
            {stats.chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center border border-dashed border-white/5 rounded-3xl">
                <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest">Sin datos en este período</p>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2 h-48 items-end">
                  {stats.chartData.map(([f, m]) => {
                    const pct = (m / maxBarra) * 100
                    return (
                      <div key={f} className="flex-1 h-full relative group">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ease-out group-hover:brightness-125"
                          style={{
                            height: `${Math.max(pct, 4)}%`,
                            backgroundColor: colorP,
                            opacity: 0.3 + (pct / 100) * 0.7,
                            boxShadow: `0 0 30px ${colorP}20`
                          }}
                        />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                          <span className="text-[10px] font-black bg-white text-black px-3 py-1 rounded-full whitespace-nowrap shadow-xl">
                            ${m.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-6 pt-6 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                    {new Date(stats.chartData[0][0] + 'T12:00:00').toLocaleDateString('es-AR', {day: 'numeric', month: 'short'})}
                  </span>
                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                    {new Date(stats.chartData[stats.chartData.length - 1][0] + 'T12:00:00').toLocaleDateString('es-AR', {day: 'numeric', month: 'short'})}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Staff Ranking Luxury */}
          {stats.staffData.length > 0 && (
            <div className="bg-white/5 border border-white/10 p-12 rounded-[3.5rem]">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-10 tracking-[0.3em]">Top Staff</p>
              <div className="space-y-6">
                {stats.staffData.map(([nombre, cant]) => {
                  const pct = stats.cantidad > 0 ? (cant / Math.max(...stats.staffData.map(d => d[1]))) * 100 : 0
                  return (
                    <div key={nombre} className="group">
                      <div className="flex justify-between mb-3">
                        <span className="text-xs font-black uppercase italic tracking-wider">{nombre}</span>
                        <span className="text-xs font-black" style={{ color: colorP }}>{cant} Turnos</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                        <div className="h-full rounded-full transition-all duration-1000 ease-in-out group-hover:opacity-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                          style={{ width: `${pct}%`, backgroundColor: colorP, opacity: 0.6 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
        
        <footer className="mt-20 pt-10 border-t border-white/5 text-center">
           <p className="text-[10px] text-slate-800 font-black uppercase tracking-[0.5em]">turnly by F&V Tech</p>
        </footer>
      </div>
    </div>
  )
}
