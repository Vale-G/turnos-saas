'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type StatTurno = {
  fecha: string
  estado: string
  pago_estado: string | null
  pago_tipo: string | null
  Servicio?: { nombre: string; precio: number }
  Staff?: { nombre: string }
}

type Periodo = '7d' | '30d' | '90d'

export default function Informes() {
  const [turnos, setTurnos] = useState<StatTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [esPro, setEsPro] = useState(false)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let neg = null
      const { data: byOwner } = await supabase.from('Negocio').select('id, tema, suscripcion_tipo').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else {
        const { data: byId } = await supabase.from('Negocio').select('id, tema, suscripcion_tipo').eq('id', user.id).single()
        neg = byId
      }

      if (!neg) { router.push('/dashboard'); return }
      if (neg.suscripcion_tipo !== 'pro') { router.push('/dashboard'); return }

      setNegocioId(neg.id)
      setEsPro(true)
      setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    async function cargar() {
      setLoading(true)
      const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
      const desde = new Date()
      desde.setDate(desde.getDate() - dias)
      const desdeStr = desde.toISOString().split('T')[0]

      const { data } = await supabase
        .from('Turno')
        .select('fecha, estado, pago_estado, pago_tipo, Servicio(nombre, precio), Staff(nombre)')
        .eq('negocio_id', negocioId)
        .gte('fecha', desdeStr)
        .order('fecha', { ascending: true })

      setTurnos((data as unknown as StatTurno[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [negocioId, periodo])

  // Métricas
  const activos = turnos.filter(t => t.estado !== 'cancelado')
  const cobrados = turnos.filter(t => t.pago_estado === 'cobrado')
  const totalIngreso = cobrados.reduce((s, t) => s + (t.Servicio?.precio ?? 0), 0)
  const ticketPromedio = cobrados.length ? totalIngreso / cobrados.length : 0

  // Servicios más pedidos
  const porServicio: Record<string, { count: number; ingreso: number }> = {}
  activos.forEach(t => {
    const n = t.Servicio?.nombre ?? 'Sin servicio'
    const p = t.Servicio?.precio ?? 0
    if (!porServicio[n]) porServicio[n] = { count: 0, ingreso: 0 }
    porServicio[n].count++
    if (t.pago_estado === 'cobrado') porServicio[n].ingreso += p
  })
  const serviciosRanking = Object.entries(porServicio)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  // Barbero más activo
  const porBarbero: Record<string, number> = {}
  activos.forEach(t => {
    const n = t.Staff?.nombre ?? 'Sin asignar'
    porBarbero[n] = (porBarbero[n] ?? 0) + 1
  })
  const barberoRanking = Object.entries(porBarbero).sort((a, b) => b[1] - a[1])

  // Tipo de pago
  const porPago: Record<string, number> = {}
  cobrados.forEach(t => {
    const tp = t.pago_tipo ?? 'sin registrar'
    porPago[tp] = (porPago[tp] ?? 0) + 1
  })

  // Ingresos por día (para sparkline)
  const porDia: Record<string, number> = {}
  cobrados.forEach(t => {
    porDia[t.fecha] = (porDia[t.fecha] ?? 0) + (t.Servicio?.precio ?? 0)
  })
  const diasOrdenados = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0]))
  const maxDia = Math.max(...diasOrdenados.map(d => d[1]), 1)

  if (!esPro && !loading) return null

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">
            Volver
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
              Informes
            </h1>
            <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-full">PRO</span>
          </div>
        </div>

        {/* Selector periodo */}
        <div className="flex gap-2 mb-8">
          {(['7d', '30d', '90d'] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={'px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all ' +
                (periodo === p ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}
              style={periodo === p ? { backgroundColor: colorPrincipal } : {}}>
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-700 font-black italic animate-pulse">Calculando...</div>
        ) : (
          <div className="space-y-6">

            {/* KPIs principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Turnos', value: activos.length, color: 'text-white' },
                { label: 'Cobrado', value: '$' + totalIngreso.toLocaleString('es-AR'), color: 'text-emerald-400' },
                { label: 'Ticket promedio', value: '$' + Math.round(ticketPromedio).toLocaleString('es-AR'), color: colorPrincipal },
                { label: 'Cancelados', value: turnos.filter(t => t.estado === 'cancelado').length, color: 'text-red-400' },
              ].map(k => (
                <div key={k.label} className="bg-white/4 border border-white/8 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">{k.label}</p>
                  <p className="text-2xl font-black italic" style={k.color.startsWith('#') || k.color.startsWith('var') ? { color: k.color } : {}}>
                    <span className={k.color.startsWith('text-') ? k.color : ''}>{k.value}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* Sparkline ingresos */}
            {diasOrdenados.length > 0 && (
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-4">Ingresos por día</p>
                <div className="flex items-end gap-1 h-16">
                  {diasOrdenados.map(([fecha, monto]) => (
                    <div key={fecha} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: colorPrincipal }}>
                        ${monto.toLocaleString('es-AR')}
                      </div>
                      <div className="w-full rounded-sm transition-all"
                        style={{
                          height: Math.max(4, (monto / maxDia) * 56) + 'px',
                          backgroundColor: colorPrincipal,
                          opacity: 0.4 + 0.6 * (monto / maxDia),
                        }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-bold">
                  <span>{diasOrdenados[0]?.[0]}</span>
                  <span>{diasOrdenados[diasOrdenados.length - 1]?.[0]}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Servicios top */}
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-4">Servicios más pedidos</p>
                {serviciosRanking.length === 0 ? (
                  <p className="text-slate-600 text-xs italic">Sin datos</p>
                ) : serviciosRanking.map(([nombre, stats], i) => (
                  <div key={nombre} className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black text-slate-600 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black">{nombre}</span>
                        <span className="text-[9px] text-slate-400">{stats.count} turnos</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: (stats.count / (serviciosRanking[0]?.[1].count || 1) * 100) + '%',
                            backgroundColor: colorPrincipal,
                          }} />
                      </div>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-black w-16 text-right">
                      ${stats.ingreso.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Barberos */}
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-4">Barberos</p>
                {barberoRanking.length === 0 ? (
                  <p className="text-slate-600 text-xs italic">Sin datos</p>
                ) : barberoRanking.map(([nombre, count], i) => (
                  <div key={nombre} className="flex items-center gap-3 mb-3">
                    <span className="text-[9px] font-black text-slate-600 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black">{nombre}</span>
                        <span className="text-[9px] text-slate-400">{count} turnos</span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{
                            width: (count / (barberoRanking[0]?.[1] || 1) * 100) + '%',
                            backgroundColor: colorPrincipal,
                            opacity: 0.7,
                          }} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Tipo de pago */}
                {Object.keys(porPago).length > 0 && (
                  <>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3 mt-6">Tipo de cobro</p>
                    {Object.entries(porPago).map(([tipo, count]) => (
                      <div key={tipo} className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black capitalize">{tipo}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{count} pagos</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Tasa de completados */}
            <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">Tasa de completados</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500"
                    style={{ width: (activos.length ? cobrados.length / activos.length * 100 : 0) + '%' }} />
                </div>
                <span className="font-black text-emerald-400 text-lg">
                  {activos.length ? Math.round(cobrados.length / activos.length * 100) : 0}%
                </span>
              </div>
              <p className="text-[9px] text-slate-600 mt-2">
                {cobrados.length} cobrados de {activos.length} turnos activos
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
