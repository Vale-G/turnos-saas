'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'

function toBaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date)
}

type TurnoItem = {
  id: string; hora: string; cliente_nombre: string
  estado: string; fecha: string
  pago_tipo: string | null; pago_estado: string | null
  servicio?: { nombre: string; precio: number }
  staff?: { nombre: string }
}

type Vista = 'dia' | 'semana'
const ESTADOS_TURNO = ['pendiente', 'confirmado', 'completado', 'cancelado']
const TIPOS_PAGO = ['efectivo', 'mercadopago', 'transferencia', 'otro']

export default function AgendaTurnosElite() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  // FIX TIMEZONE: Inicializa siempre con la fecha real de Argentina
  const [fechaFiltro, setFechaFiltro] = useState(toBaDateStr(new Date()))
  const [vista, setVista] = useState<Vista>('dia')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const [turnoEditar, setTurnoEditar] = useState<TurnoItem | null>(null)
  const router = useRouter()

  const totalCobrado = useMemo(
    () => turnos.filter(t => t.pago_estado === 'cobrado').reduce((a, t) => a + (t.servicio?.precio ?? 0), 0),
    [turnos]
  )

  const estadoColor = (e: string) =>
    ({ confirmado: 'bg-emerald-500', pendiente: 'bg-amber-500', cancelado: 'bg-rose-500', completado: 'bg-slate-400' })[e] ?? 'bg-slate-500'

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: neg } = await supabase.from('negocio').select('id, tema').eq('owner_id', user.id).single()
      if (!neg) { router.push('/onboarding'); return }
      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    let mounted = true
    async function load() {
      setLoading(true)
      let query = supabase.from('turno')
        .select('*, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })

      if (vista === 'dia') {
        query = query.eq('fecha', fechaFiltro)
      } else {
        const inicio = new Date(fechaFiltro + 'T12:00:00-03:00')
        const lunes = new Date(inicio)
        lunes.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        query = query
          .gte('fecha', toBaDateStr(lunes))
          .lte('fecha', toBaDateStr(domingo))
      }

      const { data } = await query
      if (mounted) { setTurnos((data as any[]) ?? []); setLoading(false) }
    }
    void load()
    return () => { mounted = false }
  }, [negocioId, fechaFiltro, vista, reloadKey])

  const moverFecha = (dias: number) => {
    const d = new Date(fechaFiltro + 'T12:00:00-03:00')
    d.setDate(d.getDate() + (vista === 'semana' ? dias * 7 : dias))
    setFechaFiltro(toBaDateStr(d))
  }

  const cambiarEstado = useCallback(async (id: string, estado: string) => {
    await supabase.from('turno').update({ estado }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const registrarPago = useCallback(async (id: string, tipo: string) => {
    await supabase.from('turno').update({ pago_tipo: tipo, pago_estado: 'cobrado', estado: 'completado' }).eq('id', id)
    setTurnoEditando(null)
    toast.success('Cobro registrado')
    setReloadKey(k => k + 1)
  }, [])

  const deshacerPago = useCallback(async (id: string) => {
    await supabase.from('turno').update({ pago_tipo: null, pago_estado: 'pendiente' }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const eliminarTurno = useCallback(async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar este turno?')) return
    await supabase.from('turno').delete().eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const guardarEdicion = async () => {
    if (!turnoEditar) return
    await supabase.from('turno').update({
      cliente_nombre: turnoEditar.cliente_nombre,
      fecha: turnoEditar.fecha,
      hora: turnoEditar.hora,
      estado: turnoEditar.estado,
    }).eq('id', turnoEditar.id)
    setTurnoEditar(null)
    toast.success('Turno actualizado')
    setReloadKey(k => k + 1)
  }

  const turnosFiltrados = busqueda.trim()
    ? turnos.filter(t =>
        t.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.servicio?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.staff?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : turnos

  const turnosPorFecha = useMemo(() => {
    const mapa: Record<string, TurnoItem[]> = {}
    turnos.forEach(t => {
      if (!mapa[t.fecha]) mapa[t.fecha] = []
      mapa[t.fecha].push(t)
    })
    return mapa
  }, [turnos])

  const diasSemana = useMemo(() => {
    const inicio = new Date(fechaFiltro + 'T12:00:00-03:00')
    const lunes = new Date(inicio)
    lunes.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes); d.setDate(lunes.getDate() + i)
      return { iso: toBaDateStr(d), label: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, weekday: 'short', day: 'numeric' }).format(d) }
    })
  }, [fechaFiltro])

  const TurnoCard = ({ t }: { t: TurnoItem }) => (
    <div className={'rounded-[2.5rem] border overflow-hidden transition-all ' +
      (t.estado === 'cancelado' ? 'opacity-40 border-white/5 bg-white/2' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20')}>
      <div className="p-6 flex items-center gap-4 justify-between">
        <div className="flex items-center gap-5">
          <div className={'w-2 h-14 rounded-full flex-shrink-0 ' + estadoColor(t.estado)} />
          <p className="text-2xl font-black italic w-16 flex-shrink-0" style={{ color: colorPrincipal }}>
            {t.hora.slice(0, 5)}
          </p>
          <div>
            <p className="font-black uppercase text-base leading-tight tracking-tight">{t.cliente_nombre}</p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{t.servicio?.nombre} · {t.staff?.nombre}</p>
            <p className={'text-[10px] font-black uppercase mt-1 ' + (t.pago_estado === 'cobrado' ? 'text-emerald-400' : 'text-amber-400')}>
              {t.pago_estado === 'cobrado' ? 'COBRADO · ' + (t.pago_tipo ?? '') : 'SIN COBRAR'}
              {t.servicio?.precio ? ' $' + t.servicio.precio.toLocaleString('es-AR') : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button onClick={() => setTurnoEditar({ ...t })}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-300 hover:text-white">
            Editar
          </button>
          <button onClick={() => setTurnoEditando(turnoEditando === t.id ? null : t.id)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-300 hover:text-white">
            Cobro
          </button>
        </div>
      </div>

      {turnoEditando === t.id && (
        <div className="border-t border-white/10 p-6 bg-black/40 space-y-5 animate-in slide-in-from-top-2">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3">Estado del Turno</p>
            <div className="flex gap-2 flex-wrap">
              {ESTADOS_TURNO.map(e => (
                <button key={e} onClick={() => cambiarEstado(t.id, e)}
                  className={'px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ' +
                    (t.estado === e ? 'text-black border-transparent shadow-lg' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}
                  style={t.estado === e ? { backgroundColor: colorPrincipal } : {}}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3">Registrar Cobro</p>
            <div className="flex gap-2 flex-wrap">
              {TIPOS_PAGO.map(tipo => (
                <button key={tipo} onClick={() => registrarPago(t.id, tipo)}
                  className={'px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ' +
                    (t.pago_tipo === tipo && t.pago_estado === 'cobrado'
                      ? 'bg-emerald-500 text-black border-transparent shadow-lg'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30')}>
                  {tipo === 'mercadopago' ? 'MERCADOPAGO' : tipo.toUpperCase()}
                </button>
              ))}
              {t.pago_estado === 'cobrado' && (
                <button onClick={() => deshacerPago(t.id)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                  Deshacer
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => eliminarTurno(t.id)}
              className="text-[10px] font-black uppercase text-red-500/60 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all">
              Eliminar Turno
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Elite */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">
              ← Dashboard
            </button>
            <h1 className="text-7xl font-black uppercase italic tracking-tighter leading-none" style={{ color: colorPrincipal }}>
              Agenda
            </h1>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-5 flex gap-6 backdrop-blur-md">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Cobrado Hoy</p>
                <p className="text-2xl font-black italic text-emerald-400">${totalCobrado.toLocaleString('es-AR')}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Turnos</p>
                <p className="text-2xl font-black italic">{turnos.filter(t => t.estado !== 'cancelado').length}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl flex-1">
                {(['dia', 'semana'] as Vista[]).map(v => (
                  <button key={v} onClick={() => setVista(v)}
                    className={'flex-1 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ' +
                      (vista === v ? 'text-black shadow-md' : 'text-slate-400 hover:text-white')}
                    style={vista === v ? { backgroundColor: colorPrincipal } : {}}>
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-2xl">
                <button onClick={() => moverFecha(-1)} className="px-3 py-2 text-slate-400 hover:text-white font-black hover:bg-white/5 rounded-xl transition-all">{'<'}</button>
                <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)}
                  className="bg-transparent font-black text-xs outline-none cursor-pointer px-2 text-center uppercase tracking-widest text-slate-200 [&::-webkit-calendar-picker-indicator]:invert" />
                <button onClick={() => moverFecha(1)} className="px-3 py-2 text-slate-400 hover:text-white font-black hover:bg-white/5 rounded-xl transition-all">{'>'}</button>
              </div>
            </div>
          </div>
        </div>

        <input
          type="text"
          placeholder="BUSCAR CLIENTE, SERVICIO O STAFF..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 py-5 text-xs font-black uppercase tracking-widest outline-none focus:border-white/30 transition-all mb-8 placeholder:text-slate-700 shadow-inner"
        />

        {/* Modal de Edición Elite */}
        {turnoEditar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#020617] border border-white/10 rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h3 className="font-black italic uppercase text-2xl tracking-tighter" style={{ color: colorPrincipal }}>Editar Turno</h3>
                <button onClick={() => setTurnoEditar(null)} className="text-slate-500 hover:text-white font-black w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">X</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Cliente</label>
                  <input type="text" value={turnoEditar.cliente_nombre}
                    onChange={e => setTurnoEditar({ ...turnoEditar, cliente_nombre: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-white/30 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Fecha</label>
                    <input type="date" value={turnoEditar.fecha}
                      onChange={e => setTurnoEditar({ ...turnoEditar, fecha: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Hora</label>
                    <input type="time" value={turnoEditar.hora.slice(0, 5)}
                      onChange={e => setTurnoEditar({ ...turnoEditar, hora: e.target.value + ':00' })}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-10">
                <button onClick={() => setTurnoEditar(null)}
                  className="flex-1 py-4 rounded-[2rem] font-black uppercase text-xs border border-white/10 text-slate-400 hover:bg-white/5 transition-all">
                  Cancelar
                </button>
                <button onClick={guardarEdicion}
                  className="flex-1 py-4 rounded-[2rem] font-black uppercase italic text-sm text-black transition-all hover:scale-105"
                  style={{ backgroundColor: colorPrincipal }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listado de Turnos */}
        {vista === 'dia' && (
          loading ? (
            <div className="text-center py-20 font-black italic text-slate-800 animate-pulse text-3xl uppercase tracking-tighter">SINCRONIZANDO...</div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Agenda libre para este día</p>
            </div>
          ) : (
            <div className="space-y-4">
              {turnosFiltrados.map(t => <TurnoCard key={t.id} t={t} />)}
            </div>
          )
        )}

        {vista === 'semana' && (
          <div className="space-y-10 overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 font-black italic text-slate-800 animate-pulse text-3xl uppercase tracking-tighter">SINCRONIZANDO...</div>
            ) : diasSemana.map(dia => {
              const turnosDia = turnosPorFecha[dia.iso] ?? []
              const esHoy = dia.iso === toBaDateStr(new Date())
              return (
                <div key={dia.iso} className="bg-white/5 border border-white/5 p-6 rounded-[3rem]">
                  <div className="flex items-center gap-4 mb-6 px-4">
                    <p className={'text-sm font-black uppercase tracking-[0.2em] ' + (esHoy ? '' : 'text-slate-500')}
                      style={esHoy ? { color: colorPrincipal } : {}}>
                      {dia.label}
                    </p>
                    {turnosDia.length > 0 && (
                      <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-xl text-slate-300">{turnosDia.length} TURNOS</span>
                    )}
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  {turnosDia.length === 0 ? (
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest pl-4">Día sin actividad</p>
                  ) : (
                    <div className="space-y-3">
                      {turnosDia.map(t => <TurnoCard key={t.id} t={t} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
