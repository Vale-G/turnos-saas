'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { OwnerInsights } from '@/components/dashboard/OwnerInsights'
import { reportFor, related, type ReportRow } from '@/lib/owner-report'
import { hasProAccess } from '@/lib/server/plan-access'
import { getThemeColor } from '@/lib/theme'

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }

function getMonthRange(monthIso: string) {
  const [y, m] = monthIso.split('-').map(Number)
  const start = `${monthIso}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, next }
}

type NegocioInforme = {
  id: string
  tema: string | null
  suscripcion_tipo: string | null
}

export default function InformesElite() {
  const [negocio, setNegocio] = useState<NegocioInforme | null>(null)
  const [result, setResult] = useState<{ key: string; rows: ReportRow[]; error: boolean } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [serviceFilter,setServiceFilter] = useState('')
  const [detail,setDetail] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [restrictedRole, setRestrictedRole] = useState(false)
  const [accessError, setAccessError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tieneAcceso, setTieneAcceso] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(toBaDateStr(new Date()).slice(0, 7))
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm, error: roleError } = await supabase.from('adminrol').select('negocio_id,role').eq('user_id', user.id).maybeSingle()
      if (roleError) {
        setAccessError(true)
      } else if (!adm || ['owner', 'admin', 'superadmin'].includes(adm.role)) {
        const query = supabase.from('negocio').select('id,tema,suscripcion_tipo,trial_hasta')
        const { data, error } = await (adm?.negocio_id ? query.eq('id', adm.negocio_id) : query.eq('owner_id', user.id)).maybeSingle()
        if (error) setAccessError(true)
        if (data) {
          setNegocio(data)
          setTieneAcceso(adm?.role === 'superadmin' || hasProAccess(data))
        }
      } else {
        setRestrictedRole(true)
      }
      setLoading(false)
    }
    init()
  }, [router])

  const negocioId = negocio?.id
  const reportKey = [negocioId, mesFiltro, refresh].join('/')
  useEffect(() => {
    if (!negocioId || !tieneAcceso) return
    let active = true
    let revision = 0
    async function load() {
      const request = ++revision
      const { start, next } = getMonthRange(mesFiltro)
      const rows: ReportRow[] = []
      const size = 250
      for (let offset = 0; active && request === revision; offset += size) {
        const { data, error } = await supabase.from('turno')
          .select('id,fecha,hora,estado,precio_acordado,cancelado_por, servicio(id,nombre,precio), staff(id,nombre)')
          .eq('negocio_id', negocioId).gte('fecha', start).lt('fecha', next)
          .order('id').range(offset, offset + size - 1)
        if (!active || request !== revision) return
        if (error || !data) {
          setResult({ key: reportKey, rows: [], error: true })
          return
        }
        rows.push(...data)
        if (data.length < size) {
          setResult({ key: reportKey, rows, error: false })
          return
        }
      }
    }
    void load()
    const channel = supabase.channel('informes-' + negocioId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turno', filter: 'negocio_id=eq.' + negocioId }, load).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [negocioId, mesFiltro, tieneAcceso, reportKey])

  const current = result?.key === reportKey ? result : null
  const filtered = useMemo(()=> (current?.rows ?? []).filter(t=>(!serviceFilter || related(t.servicio)?.id===serviceFilter) && (!staffFilter || (related(t.staff)?.id ?? 'unassigned')===staffFilter)),[current,staffFilter,serviceFilter])
  const metricas = useMemo(()=>reportFor(filtered,''),[filtered])
  const services=new Map<string,string>()
  for(const row of current?.rows ?? []){
    const s=related(row.servicio)
    if(s) services.set(s.id,s.nombre ?? 'Sin nombre')
  }
  const detailRows=filtered.filter(row=>{
    if(detail==='Completadas' || detail.startsWith('Valor')) return row.estado==='completado'
    if(detail.includes('ancel')) return row.estado==='cancelado'
    if(detail==='Por completar') return !['no_asistio','completado','cancelado'].includes(row.estado ?? '')
    if(detail==='Ausencias') return row.estado==='no_asistio'
    return true
  })
  const staffOptions = new Map<string, string>()
  for (const row of current?.rows ?? []) {
    const staff = related(row.staff)
    staffOptions.set(staff?.id ?? 'unassigned', staff?.nombre ?? 'Sin asignar')
  }
  if (accessError) return <main className="p-8"><p role="alert">No pudimos verificar el acceso al informe.</p><button onClick={() => window.location.reload()}>Reintentar</button></main>
  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase text-2xl">CALCULANDO MÉTRICAS...</div>

  if (!tieneAcceso) return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 flex items-center justify-center relative overflow-hidden">
       <button onClick={() => router.push('/dashboard')} className="absolute top-12 left-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors z-20">← Volver al Dashboard</button>
       <div className="relative z-10 max-w-lg w-full bg-white/5 border border-white/10 p-12 rounded-[3.5rem] text-center backdrop-blur-xl shadow-2xl">
          <div className="w-24 h-24 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-8">🔒</div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">{restrictedRole ? 'Acceso de administración' : 'Informes PRO'}</h1>
          <p className="text-slate-400 text-sm font-medium mb-8">{restrictedRole ? 'Los informes del negocio están disponibles para sus administradores.' : 'Los informes están incluidos en el plan Pro y durante la prueba vigente.'}</p>
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
            <input aria-label="Mes del informe" type="month" value={mesFiltro} onChange={e => { if (e.target.value) { setMesFiltro(e.target.value); setStaffFilter(''); setServiceFilter(''); setDetail('') } }} className="bg-transparent font-black text-sm outline-none text-white uppercase tracking-widest [&::-webkit-calendar-picker-indicator]:invert cursor-pointer" />
          </div>
        </header>

        {!current ? <p role="status">Cargando turnos del mes…</p> : current.error ? (
          <div role="alert">No pudimos cargar los turnos. <button onClick={() => setRefresh(n => n + 1)}>Reintentar</button></div>
        ) : <>
        <label className="mb-6 inline-flex flex-col gap-1 text-sm">Profesional
          <select className="rounded-lg bg-slate-800 px-4 py-2 text-white" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
            <option value="">Todo el equipo</option>
            {staffFilter && !staffOptions.has(staffFilter) && <option value={staffFilter}>Sin turnos en este mes</option>}
            {[...staffOptions].sort((a,b) => a[1].localeCompare(b[1], 'es')).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label className="ml-4">Servicio <select className="bg-slate-900 p-2" value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}><option value="">Todos</option>{[...services].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
        {metricas.total === 0 && <p className="mb-6">No hay reservas para esta selección.</p>}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {[
            ['Reservas del mes', metricas.total], ['Completadas', metricas.completed],
            ['Ausencias', metricas.absent], ['Por completar', metricas.open], ['Canceladas', metricas.cancelled],
            ['Porcentaje de cancelación', metricas.cancellationRate === null ? '—' : metricas.cancellationRate + '%'],
            ['Valor estimado de servicios completados', '$' + metricas.estimated.toLocaleString('es-AR')],
          ].map(([label,value]) => <button type="button" onClick={()=>setDetail(String(label))} key={label} className="rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-slate-300">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>
          </button>)}
        </div>
        <p className="mb-8 text-sm text-slate-300">Se usa el precio acordado al reservar. En turnos anteriores sin precio guardado se estima con la tarifa actual. Consultá los pagos registrados en <a className="underline" href="/caja">Caja</a>.</p>
        {detail && <section className="my-6"><h2>{detail} · {detailRows.length} reservas</h2><button onClick={()=>setDetail('')}>Cerrar detalle</button><ul className="max-h-72 overflow-y-auto">{detailRows.map(r=><li key={r.id}><a href={'/turnos?fecha='+r.fecha+'&turno='+r.id}>{r.fecha} · {r.hora?.slice(0,5)} · {related(r.servicio)?.nombre} · {related(r.staff)?.nombre} · {r.estado} {r.cancelado_por}</a></li>)}</ul></section>}
        {negocioId && staffFilter!=='unassigned' && <OwnerInsights key={[reportKey,staffFilter,serviceFilter].join('/')} business={negocioId} month={mesFiltro} worker={staffFilter} service={serviceFilter}/>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* TOP SERVICIOS */}
          <div className="bg-white/4 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">Servicios por valor estimado</h2>
            {metricas.services.length === 0 ? <p className="text-xs font-black text-slate-600 uppercase tracking-widest text-center py-10">Sin datos suficientes</p> : (
              <div className="space-y-6">
                {metricas.services.map(([id, datos], i) => (
                  <div key={id} className="relative">
                    <div className="flex justify-between items-end mb-2 relative z-10">
                      <div>
                        <span className="text-xs font-black uppercase text-slate-500 mr-2">#{i + 1}</span>
                        <span className="text-sm font-black uppercase italic text-white">{datos.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black italic text-emerald-400">${datos.amount.toLocaleString('es-AR')}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{datos.count} turnos</p>
                      </div>
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full opacity-80" style={{ width: `${metricas.estimated ? datos.amount * 100 / metricas.estimated : 0}%`, backgroundColor: colorP }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RENDIMIENTO DEL STAFF */}
          <div className="bg-white/4 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 flex items-center gap-2">Servicios completados por profesional</h2>
            {metricas.team.length === 0 ? <p className="text-xs font-black text-slate-600 uppercase tracking-widest text-center py-10">Sin datos suficientes</p> : (
              <div className="space-y-4">
                {metricas.team.map(([id, datos]) => (
                  <div key={id} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">{datos.name.slice(0, 1)}</div>
                      <div>
                        <p className="text-sm font-black uppercase italic text-white">{datos.name}</p>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{datos.count} turnos atendidos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black italic" style={{ color: colorP }}>${datos.amount.toLocaleString('es-AR')}</p>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Estimado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        </>}
      </div>
    </div>
  )
}
