'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }

function getMonthRange(monthIso: string) {
  const [y, m] = monthIso.split('-').map(Number)
  const start = `${monthIso}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, next }
}

export default function InformesElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tieneAcceso, setTieneAcceso] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(toBaDateStr(new Date()).slice(0, 7))
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let negId = adm?.negocio_id
      
      if (!negId) {
         const { data: n } = await supabase.from('negocio').select('id, suscripcion_tipo, tema').eq('owner_id', user.id).maybeSingle()
         if (n) { negId = n.id; setNegocio(n); if (n.suscripcion_tipo === 'pro' || n.suscripcion_tipo === 'trial') setTieneAcceso(true) }
      } else {
        const { data: neg } = await supabase.from('negocio').select('id, tema, suscripcion_tipo').eq('id', negId).single()
        if (neg) { setNegocio(neg); if (neg.suscripcion_tipo === 'pro' || neg.suscripcion_tipo === 'trial') setTieneAcceso(true) }
      }

      if (adm?.role === 'superadmin') setTieneAcceso(true)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id || !tieneAcceso) return
    async function fetchMetricas() {
      const { start, next } = getMonthRange(mesFiltro)
      const { data } = await supabase
        .from('turno')
        .select('estado, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocio.id)
        .gte('fecha', start)
        .lt('fecha', next)
      setTurnos(data || [])
    }
    fetchMetricas()
  }, [negocio, mesFiltro, tieneAcceso])

  useEffect(() => {
    if (!negocio?.id || !tieneAcceso) return
    const channel = supabase
      .channel(`informes-turnos-${negocio.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turno', filter: `negocio_id=eq.${negocio.id}` }, async () => {
        const { start, next } = getMonthRange(mesFiltro)
        const { data } = await supabase
          .from('turno')
          .select('estado, servicio(nombre, precio), staff(nombre)')
          .eq('negocio_id', negocio.id)
          .gte('fecha', start)
          .lt('fecha', next)
        setTurnos(data || [])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [negocio?.id, mesFiltro, tieneAcceso])

  // CÁLCULOS MATEMÁTICOS (El cerebro del informe)
  const metricas = useMemo(() => {
    let ingresos = 0, completados = 0, cancelados = 0, pendientes = 0
    const topServicios: Record<string, { count: number, total: number }> = {}
    const topStaff: Record<string, { count: number, total: number }> = {}

    turnos.forEach(t => {
      const precio = t.servicio?.precio || 0
      const nombreServicio = t.servicio?.nombre || 'Desconocido'
      const nombreStaff = t.staff?.nombre || 'Sin Asignar'

      if (t.estado === 'completado') {
        ingresos += precio
        completados++
        
        // Sumar a Servicios
        if (!topServicios[nombreServicio]) topServicios[nombreServicio] = { count: 0, total: 0 }
        topServicios[nombreServicio].count++
        topServicios[nombreServicio].total += precio

        // Sumar a Staff
        if (!topStaff[nombreStaff]) topStaff[nombreStaff] = { count: 0, total: 0 }
        topStaff[nombreStaff].count++
        topStaff[nombreStaff].total += precio
      } else if (t.estado === 'cancelado') {
        cancelados++
      } else {
        pendientes++
      }
    })

    const totalTurnos = completados + cancelados + pendientes
    const tasaAsistencia = totalTurnos > 0 ? Math.round((completados / totalTurnos) * 100) : 0

    return {
      ingresos, completados, cancelados, pendientes, totalTurnos, tasaAsistencia,
      servicios: Object.entries(topServicios).sort((a, b) => b[1].total - a[1].total).slice(0, 5),
      staff: Object.entries(topStaff).sort((a, b) => b[1].total - a[1].total)
    }
  }, [turnos])

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase text-2xl">CALCULANDO MÉTRICAS...</div>

  if (!tieneAcceso) return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 flex items-center justify-center relative overflow-hidden">
       <button onClick={() => router.push('/dashboard')} className="absolute top-12 left-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors z-20">← Volver al Dashboard</button>
       <div className="relative z-10 max-w-lg w-full bg-white/5 border border-white/10 p-12 rounded-[3.5rem] text-center backdrop-blur-xl shadow-2xl">
          <div className="w-24 h-24 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-8">🔒</div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">Función <span className="text-amber-400">PRO</span></h1>
          <p className="text-slate-400 text-sm font-medium mb-8">Los informes estadísticos son exclusivos del plan PRO Elite.</p>
       </div>
    </div>
  )

  const colorP = getThemeColor(negocio?.tema)

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Informes <span style={{ color: colorP }}>PRO</span></h1>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className="bg-transparent font-black text-sm outline-none text-white uppercase tracking-widest [&::-webkit-calendar-picker-indicator]:invert cursor-pointer" />
          </div>
        </header>

        {/* TARJETAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 transition-all group-hover:opacity-40" style={{ backgroundColor: colorP }} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Ingresos Brutos</p>
            <p className="text-4xl font-black italic" style={{ color: colorP }}>${metricas.ingresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Turnos Completados</p>
            <p className="text-4xl font-black italic text-white">{metricas.completados}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Turnos Cancelados</p>
            <p className="text-4xl font-black italic text-rose-400">{metricas.cancelados}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Tasa de Asistencia</p>
            <p className="text-4xl font-black italic text-emerald-400">{metricas.tasaAsistencia}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* TOP SERVICIOS */}
          <div className="bg-white/4 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">🏆 Servicios Más Rentables</h2>
            {metricas.servicios.length === 0 ? <p className="text-xs font-black text-slate-600 uppercase tracking-widest text-center py-10">Sin datos suficientes</p> : (
              <div className="space-y-6">
                {metricas.servicios.map(([nombre, datos], i) => (
                  <div key={nombre} className="relative">
                    <div className="flex justify-between items-end mb-2 relative z-10">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-500 mr-2">#{i + 1}</span>
                        <span className="text-sm font-black uppercase italic text-white">{nombre}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black italic text-emerald-400">${datos.total.toLocaleString('es-AR')}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{datos.count} turnos</p>
                      </div>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full opacity-80" style={{ width: `${(datos.total / metricas.ingresos) * 100}%`, backgroundColor: colorP }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RENDIMIENTO DEL STAFF */}
          <div className="bg-white/4 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">👥 Rendimiento del Equipo</h2>
            {metricas.staff.length === 0 ? <p className="text-xs font-black text-slate-600 uppercase tracking-widest text-center py-10">Sin datos suficientes</p> : (
              <div className="space-y-4">
                {metricas.staff.map(([nombre, datos]) => (
                  <div key={nombre} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🧔</div>
                      <div>
                        <p className="text-sm font-black uppercase italic text-white">{nombre}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{datos.count} turnos atendidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black italic" style={{ color: colorP }}>${datos.total.toLocaleString('es-AR')}</p>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Generado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
