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
      const desde = new Date(); desde.setDate(desde.getDate() - dias)
      const { data } = await supabase.from('turno').select('fecha, estado, pago_estado, servicio(precio), staff(nombre)')
        .eq('negocio_id', negocio.id).gte('fecha', desde.toISOString().split('T')[0]).order('fecha', { ascending: true })
      setTurnos(data ?? []); setLoading(false)
    }
    cargar()
  }, [negocio, periodo])

  const colorP = getThemeColor(negocio?.tema)
  const stats = useMemo(() => {
    const cobrados = turnos.filter(t => t.pago_estado === 'cobrado')
    const total = cobrados.reduce((acc, t) => acc + (t.servicio?.precio ?? 0), 0)
    
    // CORRECCIÓN DE GRÁFICO: Asegurar que el mapa de fechas sea correcto
    const ingresosMap: Record<string, number> = {}
    cobrados.forEach(t => { 
      const f = t.fecha.split('T')[0]
      ingresosMap[f] = (ingresosMap[f] ?? 0) + (t.servicio?.precio ?? 0) 
    })
    
    return {
      total,
      cantidad: turnos.filter(t => t.estado !== 'cancelado').length,
      ticket: cobrados.length ? total / cobrados.length : 0,
      chartData: Object.entries(ingresosMap).sort((a,b) => a[0].localeCompare(b[0]))
    }
  }, [turnos])

  const maxBarra = Math.max(...stats.chartData.map(d => d[1]), 1)

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black italic text-white animate-pulse">GENERANDO INFORMES...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white">← Dashboard</button>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Métricas <span style={{color: colorP}}>PRO</span></h1>
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl">
            {['7d', '30d', '90d'].map((p: any) => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${periodo === p ? 'text-black' : 'text-slate-500'}`} style={periodo === p ? {backgroundColor: colorP} : {}}>{p}</button>
            ))}
          </div>
        </header>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20" style={{backgroundColor: colorP}} />
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Ingresos</p>
              <p className="text-5xl font-black italic text-emerald-400">${stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]"><p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Turnos</p><p className="text-5xl font-black italic">{stats.cantidad}</p></div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]"><p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Ticket Prom.</p><p className="text-5xl font-black italic" style={{color: colorP}}>${Math.round(stats.ticket).toLocaleString()}</p></div>
          </div>

          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-10 tracking-widest text-center">Tendencia de Ingresos</p>
            <div className="flex items-end gap-2 h-40">
              {stats.chartData.map(([f, m]) => (
                <div key={f} className="flex-1 group relative">
                   <div className="w-full rounded-full transition-all duration-700" style={{ height: (m/maxBarra * 100) + '%', backgroundColor: colorP, opacity: 0.4 + (m/maxBarra * 0.6) }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
