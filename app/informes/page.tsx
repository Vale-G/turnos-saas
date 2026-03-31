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

export default function InformesElite() {
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
    
    const ingresosMap: Record<string, number> = {}
    cobrados.forEach(t => { ingresosMap[t.fecha] = (ingresosMap[t.fecha] ?? 0) + (t.servicio?.precio ?? 0) })
    
    const svcs: Record<string, number> = {}
    activos.forEach(t => { const n = t.servicio?.nombre ?? 'Otro'; svcs[n] = (svcs[n] ?? 0) + 1 })

    return {
      total,
      cantidad: activos.length,
      ticket: cobrados.length ? total / cobrados.length : 0,
      chartData: Object.entries(ingresosMap).sort((a,b) => a[0].localeCompare(b[0])),
      ranking: Object.entries(svcs).sort((a,b) => b[1]-a[1]).slice(0,5)
    }
  }, [turnos])

  const colorP = getThemeColor(negocio?.tema)
  const maxBarra = Math.max(...stats.chartData.map(d => d[1]), 1)

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black italic text-white animate-pulse">CARGANDO MÉTRICAS...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none">Status <span style={{color: colorP}}>PRO</span></h1>
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${periodo === p ? 'text-black' : 'text-slate-500'}`} style={periodo === p ? {backgroundColor: colorP} : {}}>{p === '7d' ? 'Semana' : p === '30d' ? 'Mes' : '90 Días'}</button>
            ))}
          </div>
        </header>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20" style={{backgroundColor: colorP}} />
              <p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Facturación Total</p>
              <p className="text-5xl font-black italic text-emerald-400">${stats.total.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]"><p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Turnos Activos</p><p className="text-5xl font-black italic">{stats.cantidad}</p></div>
            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]"><p className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Ticket Promedio</p><p className="text-5xl font-black italic" style={{color: colorP}}>${Math.round(stats.ticket).toLocaleString()}</p></div>
          </div>

          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-10 tracking-widest text-center">Ingresos Diarios</p>
            <div className="flex items-end gap-2 h-40">
              {stats.chartData.length === 0 ? <p className="w-full text-center text-slate-700 italic font-black">Sin datos</p> : stats.chartData.map(([f, m]) => (
                <div key={f} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full rounded-full transition-all duration-700" style={{ height: (m/maxBarra * 100) + '%', backgroundColor: colorP, opacity: 0.3 + (m/maxBarra * 0.7), boxShadow: `0 0 20px ${colorP}30` }} />
                  <span className="text-[8px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity uppercase">{f.split('-')[2]}/{f.split('-')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
