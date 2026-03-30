'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type TurnoItem = {
  id: string; hora: string; cliente_nombre: string
  estado: string; fecha: string
  pago_tipo: string | null; pago_estado: string | null
  Servicio?: { nombre: string; precio: number }
  Staff?: { nombre: string }
}

type Vista = 'dia' | 'semana'
const ESTADOS_TURNO = ['pendiente', 'confirmado', 'completado', 'cancelado']
const TIPOS_PAGO = ['efectivo', 'mercadopago', 'transferencia', 'otro']

export default function AgendaTurnos() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [vista, setVista] = useState<Vista>('dia')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const [turnoEditar, setTurnoEditar] = useState<TurnoItem | null>(null)
  const [_staffList, _setStaffList] = useState<{ id: string; nombre: string }[]>([])
  const [_serviciosList, _setServiciosList] = useState<{ id: string; nombre: string; precio: number; duracion: number }[]>([])
  const router = useRouter()

  const totalCobrado = useMemo(
    () => turnos.filter(t => t.pago_estado === 'cobrado').reduce((a, t) => a + (t.Servicio?.precio ?? 0), 0),
    [turnos]
  )

  const estadoColor = (e: string) =>
    ({ confirmado: 'bg-emerald-500', pendiente: 'bg-amber-500', cancelado: 'bg-rose-500', completado: 'bg-slate-400' })[e] ?? 'bg-slate-500'

  // Carga negocio
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      let neg = null
      const { data: byOwner } = await supabase.from('negocio').select('id, tema').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else { const { data: byId } = await supabase.from('negocio').select('id, tema').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single(); neg = byId }
      if (!neg) { router.push('/onboarding'); return }
      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
      const [{ data: stf }, { data: svcs }] = await Promise.all([
        supabase.from('staff').select('id, nombre').eq('negocio_id', neg.id).eq('activo', true),
        supabase.from('servicio').select('id, nombre, precio, duracion').eq('negocio_id', neg.id),
      ])
      _setStaffList(stf ?? [])
      _setServiciosList(svcs ?? [])
    }
    init()
  }, [router])

  // Carga turnos
  useEffect(() => {
    if (!negocioId) return
    let mounted = true
    async function load() {
      setLoading(true)
      let query = supabase.from('turno')
        .select('*, Servicio(nombre, precio), Staff(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })

      if (vista === 'dia') {
        query = query.eq('fecha', fechaFiltro)
      } else {
        const inicio = new Date(fechaFiltro + 'T12:00:00')
        const lunes = new Date(inicio)
        lunes.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        query = query
          .gte('fecha', lunes.toISOString().split('T')[0])
          .lte('fecha', domingo.toISOString().split('T')[0])
      }

      const { data } = await query
      if (mounted) { setTurnos((data as TurnoItem[]) ?? []); setLoading(false) }
    }
    void load()
    return () => { mounted = false }
  }, [negocioId, fechaFiltro, vista, reloadKey])

  const moverFecha = (dias: number) => {
    const d = new Date(fechaFiltro + 'T12:00:00')
    d.setDate(d.getDate() + (vista === 'semana' ? dias * 7 : dias))
    setFechaFiltro(d.toISOString().split('T')[0])
  }

  const cambiarEstado = useCallback(async (id: string, estado: string) => {
    await supabase.from('turno').update({ estado }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const registrarPago = useCallback(async (id: string, tipo: string) => {
    await supabase.from('turno').update({ pago_tipo: tipo, pago_estado: 'cobrado', estado: 'completado' }).eq('id', id)
    setTurnoEditando(null)
    setReloadKey(k => k + 1)
  }, [])

  const deshacerPago = useCallback(async (id: string) => {
    await supabase.from('turno').update({ pago_tipo: null, pago_estado: 'pendiente' }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const eliminarTurno = useCallback(async (id: string) => {
    if (!confirm('Seguro?')) return
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
    setReloadKey(k => k + 1)
  }

  const turnosFiltrados = busqueda.trim()
    ? turnos.filter(t =>
        t.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.Servicio?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.Staff?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : turnos

  // Agrupar por fecha para vista semanal
  const turnosPorFecha = useMemo(() => {
    const mapa: Record<string, TurnoItem[]> = {}
    turnos.forEach(t => {
      if (!mapa[t.fecha]) mapa[t.fecha] = []
      mapa[t.fecha].push(t)
    })
    return mapa
  }, [turnos])

  // Labels de la semana actual
  const diasSemana = useMemo(() => {
    const inicio = new Date(fechaFiltro + 'T12:00:00')
    const lunes = new Date(inicio)
    lunes.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes); d.setDate(lunes.getDate() + i)
      return { iso: d.toISOString().split('T')[0], label: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }) }
    })
  }, [fechaFiltro])

  const TurnoCard = ({ t }: { t: TurnoItem }) => (
    <div className={'rounded-[1.5rem] border overflow-hidden transition-all ' +
      (t.estado === 'cancelado' ? 'opacity-40 border-white/5 bg-white/2' : 'border-white/8 bg-white/4 hover:border-white/15')}>
      <div className="p-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className={'w-1 h-10 rounded-full flex-shrink-0 ' + estadoColor(t.estado)} />
          <p className="text-lg font-black italic w-12 flex-shrink-0" style={{ color: colorPrincipal }}>
            {t.hora.slice(0, 5)}
          </p>
          <div>
            <p className="font-black uppercase text-sm leading-tight">{t.cliente_nombre}</p>
            <p className="text-[10px] text-slate-500">{t.Servicio?.nombre} · {t.Staff?.nombre}</p>
            <p className={'text-[9px] font-black ' + (t.pago_estado === 'cobrado' ? 'text-emerald-400' : 'text-amber-400')}>
              {t.pago_estado === 'cobrado' ? 'Cobrado · ' + (t.pago_tipo ?? '') : 'Sin cobrar'}
              {t.Servicio?.precio ? ' $' + t.Servicio.precio : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setTurnoEditar({ ...t })}
            className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            Editar
          </button>
          <button onClick={() => setTurnoEditando(turnoEditando === t.id ? null : t.id)}
            className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            Cobro
          </button>
        </div>
      </div>

      {/* Panel cobro */}
      {turnoEditando === t.id && (
        <div className="border-t border-white/8 p-4 bg-black/20 space-y-3">
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {ESTADOS_TURNO.map(e => (
                <button key={e} onClick={() => cambiarEstado(t.id, e)}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                    (t.estado === e ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}
                  style={t.estado === e ? { backgroundColor: colorPrincipal } : {}}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Registrar cobro</p>
            <div className="flex gap-2 flex-wrap">
              {TIPOS_PAGO.map(tipo => (
                <button key={tipo} onClick={() => registrarPago(t.id, tipo)}
                  className={'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                    (t.pago_tipo === tipo && t.pago_estado === 'cobrado'
                      ? 'bg-emerald-500 text-black border-transparent'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30')}>
                  {tipo === 'mercadopago' ? 'MercadoPago' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
              {t.pago_estado === 'cobrado' && (
                <button onClick={() => deshacerPago(t.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 transition-all">
                  Deshacer
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => eliminarTurno(t.id)}
              className="text-[9px] font-black uppercase text-red-500/40 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all">
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">
              Volver
            </button>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
              Agenda
            </h1>
            {/* Caja */}
            <div className="mt-3 bg-white/4 border border-white/8 rounded-2xl p-4 flex gap-5">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Cobrado</p>
                <p className="text-xl font-black" style={{ color: colorPrincipal }}>${totalCobrado.toLocaleString('es-AR')}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Turnos</p>
                <p className="text-xl font-black">{turnos.filter(t => t.estado !== 'cancelado').length}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 self-start md:mt-8">
            {/* Toggle vista */}
            <div className="flex gap-1 bg-white/5 border border-white/8 p-1 rounded-xl">
              {(['dia', 'semana'] as Vista[]).map(v => (
                <button key={v} onClick={() => setVista(v)}
                  className={'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ' +
                    (vista === v ? 'text-black' : 'text-slate-400 hover:text-white')}
                  style={vista === v ? { backgroundColor: colorPrincipal } : {}}>
                  {v === 'dia' ? 'Día' : 'Semana'}
                </button>
              ))}
            </div>
            {/* Selector fecha */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-1.5 rounded-xl">
              <button onClick={() => moverFecha(-1)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-black">
                {'<'}
              </button>
              <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)}
                className="bg-transparent font-black text-xs outline-none cursor-pointer px-1" />
              <button onClick={() => moverFecha(1)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm font-black">
                {'>'}
              </button>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar cliente, servicio o barbero..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-white/25 transition-colors mb-4"
        />

        {/* Modal editar turno */}
        {turnoEditar && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 px-4 pb-0 md:pb-4">
            <div className="w-full max-w-md bg-[#020617] border border-white/10 rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black italic uppercase text-lg" style={{ color: colorPrincipal }}>Editar Turno</h3>
                <button onClick={() => setTurnoEditar(null)} className="text-slate-500 hover:text-white font-black">X</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Cliente</label>
                  <input type="text" value={turnoEditar.cliente_nombre}
                    onChange={e => setTurnoEditar({ ...turnoEditar, cliente_nombre: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Fecha</label>
                    <input type="date" value={turnoEditar.fecha}
                      onChange={e => setTurnoEditar({ ...turnoEditar, fecha: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Hora</label>
                    <input type="time" value={turnoEditar.hora.slice(0, 5)}
                      onChange={e => setTurnoEditar({ ...turnoEditar, hora: e.target.value + ':00' })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Estado</label>
                  <div className="flex gap-2 flex-wrap">
                    {ESTADOS_TURNO.map(e => (
                      <button key={e} onClick={() => setTurnoEditar({ ...turnoEditar, estado: e })}
                        className={'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                          (turnoEditar.estado === e ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10')}
                        style={turnoEditar.estado === e ? { backgroundColor: colorPrincipal } : {}}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setTurnoEditar(null)}
                  className="flex-1 py-3 rounded-2xl font-black uppercase text-sm border border-white/10 text-slate-400 hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarEdicion}
                  className="flex-1 py-3 rounded-2xl font-black uppercase text-sm text-black transition-opacity hover:opacity-90"
                  style={{ backgroundColor: colorPrincipal }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vista día */}
        {vista === 'dia' && (
          loading ? (
            <div className="text-center py-20 font-black italic text-slate-700 animate-pulse">Buscando...</div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-white/3 rounded-[2.5rem] border border-dashed border-white/10">
              <p className="text-slate-500 font-black uppercase italic">No hay turnos para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {turnosFiltrados.map(t => <TurnoCard key={t.id} t={t} />)}
            </div>
          )
        )}

        {/* Vista semana */}
        {vista === 'semana' && (
          <div className="space-y-6 overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 font-black italic text-slate-700 animate-pulse">Buscando...</div>
            ) : diasSemana.map(dia => {
              const turnosDia = turnosPorFecha[dia.iso] ?? []
              const esHoy = dia.iso === new Date().toISOString().split('T')[0]
              return (
                <div key={dia.iso}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className={'text-xs font-black uppercase tracking-widest ' + (esHoy ? '' : 'text-slate-500')}
                      style={esHoy ? { color: colorPrincipal } : {}}>
                      {dia.label}
                    </p>
                    {turnosDia.length > 0 && (
                      <span className="text-[9px] font-black text-slate-600">{turnosDia.length} turno{turnosDia.length > 1 ? 's' : ''}</span>
                    )}
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  {turnosDia.length === 0 ? (
                    <p className="text-slate-700 text-xs font-bold italic pl-2">Sin turnos</p>
                  ) : (
                    <div className="space-y-2">
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
