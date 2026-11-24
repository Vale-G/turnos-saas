'use client'

import { Suspense, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { addDaysISO, mondayOfISOWeek, todayInTimeZone } from '@/lib/local-date.mjs'

type TurnoItem = {
  id: string
  hora: string
  inicio_real?: string | null; precio_acordado?: number | null
  cliente_nombre: string
  estado: string
  fecha: string
  pago_tipo: string | null
  pago_estado: string | null
  servicio?: { nombre: string; precio: number } | null
  staff_id: string | null
  staff?: { nombre: string } | null
}

type Vista = 'dia' | 'semana'

const ESTADOS_TURNO = ['pendiente', 'confirmado', 'completado', 'cancelado','no_asistio']
const TIPOS_PAGO = ['efectivo', 'mercadopago', 'transferencia', 'otro']

function getTodayISO() {
  return todayInTimeZone()
}

function normalizeDateISO(input: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input)
  if (!match) return getTodayISO()

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) {
    return getTodayISO()
  }

  const lastDay = new Date(year, month, 0).getDate()
  const safeDay = Math.min(day, lastDay)

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

function AgendaTurnos() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const colorPrincipal = 'var(--product-accent)'
  const [fechaFiltro, setFechaFiltro] = useState(normalizeDateISO(getTodayISO()))
  const [vista, setVista] = useState<Vista>(useSearchParams().get('vista') === 'semana' ? 'semana' : 'dia')
  const [loading, setLoading] = useState(true)
  const [agendaError, setAgendaError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [professional, setProfessional] = useState('')
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const [turnoEditar, setTurnoEditar] = useState<TurnoItem | null>(null)
  const router = useRouter()

  const estadoColor = (e: string) =>
    ({ confirmado: 'bg-emerald-500', pendiente: 'bg-amber-500', cancelado: 'bg-rose-500', completado: 'bg-slate-400' })[e] ??
    'bg-slate-500'

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      let nId = null

      const params = new URLSearchParams(window.location.search)
      const day = params.get('fecha')
      if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) setFechaFiltro(normalizeDateISO(day))
      setTurnoEditando(params.get('turno'))

      const { data: adm } = await supabase.from('adminrol').select('negocio_id,role').eq('user_id', user.id).maybeSingle()
      if (adm?.negocio_id) {
        nId = adm.negocio_id
      } else {
        const { data: n } = await supabase
          .from('negocio')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (n) {
          nId = n.id
        }
      }

      if (!nId) {
        router.push('/onboarding')
        return
      }

      setNegocioId(nId)

    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    let mounted = true

    async function load() {
      setLoading(true)

      const fechaSegura = normalizeDateISO(fechaFiltro)
      if (fechaSegura !== fechaFiltro) {
        setFechaFiltro(fechaSegura)
      }

      let query = supabase
        .from('turno')
        .select('id,hora,inicio_real,precio_acordado,cliente_nombre,estado,fecha,pago_tipo,pago_estado,staff_id, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })

      if (vista === 'dia') {
        query = query.eq('fecha', fechaSegura)
      } else {
        const lunes = mondayOfISOWeek(fechaSegura)
        query = query.gte('fecha', lunes).lte('fecha', addDaysISO(lunes, 6))
      }

      const { data, error } = await query
      if (mounted) {
        setAgendaError(Boolean(error))
        setTurnos((data ?? []).map(turno => ({
          ...turno,
          servicio: Array.isArray(turno.servicio) ? turno.servicio[0] : turno.servicio,
          staff: Array.isArray(turno.staff) ? turno.staff[0] : turno.staff,
        })))
        setLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [negocioId, fechaFiltro, vista, reloadKey])

  const moverFecha = (dias: number) => {
    const base = normalizeDateISO(fechaFiltro)
    setFechaFiltro(addDaysISO(base, vista === 'semana' ? dias * 7 : dias))
  }

  const cambiarEstado = useCallback(async (id: string, estado: string) => {
    const { error } = await supabase.from('turno').update({ estado }).eq('id', id)
    if (error) return toast.error('No se pudo cambiar el estado', { description: error.message })
    toast.success('Estado actualizado')
    setReloadKey((k) => k + 1)
  }, [])

  const registrarPago = useCallback(async (id: string, tipo: string) => {
    const { error } = await supabase.from('turno').update({ pago_tipo: tipo, pago_estado: 'cobrado', estado: 'completado' }).eq('id', id)
    if (error) return toast.error('No se pudo registrar el cobro', { description: error.message })
    toast.success('Cobro registrado')
    setTurnoEditando(null)
    setReloadKey((k) => k + 1)
  }, [])

  const deshacerPago = useCallback(async (id: string) => {
    const { error } = await supabase.from('turno').update({ pago_tipo: null, pago_estado: 'pendiente' }).eq('id', id)
    if (error) return toast.error('No se pudo deshacer el cobro', { description: error.message })
    toast.success('Cobro deshecho')
    setReloadKey((k) => k + 1)
  }, [])

  const eliminarTurno = useCallback(async (id: string) => {
    if (!confirm('Seguro?')) return
    const { error } = await supabase.from('turno').delete().eq('id', id)
    if (error) return toast.error('No se pudo eliminar el turno', { description: error.message })
    toast.success('Turno eliminado')
    setReloadKey((k) => k + 1)
  }, [])

  const guardarEdicion = async () => {
    if (!turnoEditar) return
    const { error } = await supabase
      .from('turno')
      .update({
        cliente_nombre: turnoEditar.cliente_nombre,
        fecha: turnoEditar.fecha,
        hora: turnoEditar.hora,
        estado: turnoEditar.estado,
      })
      .eq('id', turnoEditar.id)

    if (error) return toast.error('No se pudo guardar el turno', { description: error.message })

    toast.success('Turno actualizado')
    setTurnoEditar(null)
    setReloadKey((k) => k + 1)
  }

  const professionals = useMemo(() => new Map(turnos.flatMap(turno =>
    turno.staff_id && turno.staff?.nombre ? [[turno.staff_id, turno.staff.nombre] as const] : [])), [turnos])
  const turnosFiltrados = useMemo(() => {
    const text = busqueda.trim().toLocaleLowerCase('es-AR')
    return turnos.filter(turno => (!professional || turno.staff_id === professional)
      && [turno.cliente_nombre, turno.servicio?.nombre, turno.staff?.nombre].some(value =>
        (value ?? '').toLocaleLowerCase('es-AR').includes(text)))
  }, [busqueda, turnos, professional])

  const turnosPorFecha = useMemo(() => {
    const mapa: Record<string, TurnoItem[]> = {}
    for (const turno of turnosFiltrados) (mapa[turno.fecha] ??= []).push(turno)
    return mapa
  }, [turnosFiltrados])

  const diasSemana = useMemo(() => {
    const lunes = mondayOfISOWeek(normalizeDateISO(fechaFiltro))

    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysISO(lunes, i)
      const d = new Date(`${iso}T12:00:00`)
      return { iso, label: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }) }
    })
  }, [fechaFiltro])

  const TurnoCard = ({ t }: { t: TurnoItem }) => (
    <div
      className={
        'rounded-[1.5rem] border overflow-hidden transition-all ' +
        (t.estado === 'cancelado' ? 'opacity-40 border-product-line bg-product-subtle' : 'border-product-line bg-product-subtle hover:border-product-line')
      }
    >
      <div className="p-4 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className={'w-1 h-10 rounded-full flex-shrink-0 ' + estadoColor(t.estado)} />
          <p className="text-lg font-black italic w-12 flex-shrink-0" style={{ color: colorPrincipal }}>
            {t.hora.slice(0, 5)}
          </p>
          <div>
            <p className="font-black uppercase text-sm leading-tight">{t.cliente_nombre}</p>
            <p className="text-[10px] text-product-muted">
              {t.servicio?.nombre} · {t.staff?.nombre}
            </p>
            <p className={'text-[9px] font-black ' + (t.pago_estado === 'cobrado' ? 'text-product-accent' : 'text-product-warning')}>
              {t.pago_estado === 'cobrado' ? 'Cobrado · ' + (t.pago_tipo ?? '') : 'Sin cobrar'}
              {t.servicio?.precio ? ' $' + t.servicio.precio : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => setTurnoEditar({ ...t })}
            className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-product-subtle hover:bg-product-subtle border border-product-line transition-all"
          >
            Editar
          </button>
          <button
            onClick={() => setTurnoEditando(turnoEditando === t.id ? null : t.id)}
            className="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-product-subtle hover:bg-product-subtle border border-product-line transition-all"
          >
            Cobro
          </button>
        </div>
      </div>

      {turnoEditando === t.id && (
        <div className="border-t border-product-line p-4 bg-black/20 space-y-3">
          <div>
            {!t.inicio_real && ['pendiente','confirmado'].includes(t.estado) && <button onClick={async ()=>{
              const {error}=await supabase.from('turno').update({inicio_real:new Date().toISOString()}).eq('id',t.id)
              if(error) toast.error('No se pudo iniciar la atención')
              else setReloadKey(k=>k+1)
            }}>Iniciar atención</button>}
            <p className="text-[9px] font-black uppercase text-product-muted tracking-widest mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {ESTADOS_TURNO.map((e) => (
                <button
                  key={e==='no_asistio'?'No asistió': e==='cancelado'?'Cancelado por el negocio':e}
                  onClick={() => cambiarEstado(t.id, e)}
                  className={
                    'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                    (t.estado === e ? 'text-product-button-ink border-transparent' : 'bg-product-subtle text-product-muted border-product-line hover:bg-product-subtle')
                  }
                  style={t.estado === e ? { backgroundColor: colorPrincipal } : {}}
                >
                  {e==='no_asistio'?'No asistió': e==='cancelado'?'Cancelado por el negocio':e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-product-muted tracking-widest mb-2">Registrar cobro</p>
            <div className="flex gap-2 flex-wrap">
              {TIPOS_PAGO.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => registrarPago(t.id, tipo)}
                  className={
                    'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                    (t.pago_tipo === tipo && t.pago_estado === 'cobrado'
                      ? 'bg-emerald-500 text-product-button-ink border-transparent'
                      : 'bg-product-subtle text-product-muted border-product-line hover:bg-emerald-500/20 hover:text-product-accent hover:border-emerald-500/30')
                  }
                >
                  {tipo === 'mercadopago' ? 'MercadoPago' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </button>
              ))}
              {t.pago_estado === 'cobrado' && (
                <button
                  onClick={() => deshacerPago(t.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-red-500/10 text-product-danger border border-red-500/20 transition-all"
                >
                  Deshacer
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => eliminarTurno(t.id)}
              className="text-[9px] font-black uppercase text-red-500/40 hover:text-product-danger hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (agendaError && !loading) {
    return <main className="p-6"><h1>Agenda</h1><p role="alert">No pudimos cargar los turnos.</p>
      <button className="my-4 underline" onClick={() => { setLoading(true); setReloadKey(k => k + 1) }}>Reintentar</button>
    </main>
  }

  return (
    <div className="min-h-screen bg-product-bg text-product-ink p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-product-muted text-[10px] font-black uppercase mb-2 block hover:text-product-ink transition-colors"
            >
              Volver
            </button>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: colorPrincipal }}>
              Agenda
            </h1>
            <div className="mt-3 bg-product-subtle border border-product-line rounded-2xl p-4 flex gap-5">
              <div>
                <p className="text-[9px] font-black uppercase text-product-muted tracking-widest mb-1">Cancelados</p>
                <p className="text-xl font-black" style={{ color: colorPrincipal }}>
                  {turnosFiltrados.filter(turno => turno.estado === 'cancelado').length}
                </p>
              </div>
              <div className="w-px bg-product-subtle" />
              <div>
                <p className="text-[9px] font-black uppercase text-product-muted tracking-widest mb-1">Turnos</p>
                <p className="text-xl font-black">{turnosFiltrados.filter((t) => t.estado !== 'cancelado').length}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 self-start md:mt-8">
            <div className="flex gap-1 bg-product-subtle border border-product-line p-1 rounded-xl">
              {(['dia', 'semana'] as Vista[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)} aria-pressed={vista === v}
                  className={
                    'min-h-11 px-3 rounded-lg text-[10px] font-black uppercase transition-all ' +
                    (vista === v ? 'text-product-button-ink' : 'text-product-muted hover:text-product-ink')
                  }
                  style={vista === v ? { backgroundColor: colorPrincipal } : {}}
                >
                  {v === 'dia' ? 'Día' : 'Semana'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-product-subtle border border-product-line p-1.5 rounded-xl">
              <button aria-label="Período anterior" onClick={() => moverFecha(-1)} className="min-h-11 min-w-11 hover:bg-product-subtle rounded-lg transition-colors text-sm font-black">
                {'<'}
              </button>
              <input
                type="date" aria-label="Fecha de agenda"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(normalizeDateISO(e.target.value))}
                className="bg-transparent font-black text-xs outline-none cursor-pointer px-1"
              />
              <button aria-label="Período siguiente" onClick={() => moverFecha(1)} className="min-h-11 min-w-11 hover:bg-product-subtle rounded-lg transition-colors text-sm font-black">
                {'>'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          aria-label="Buscar turnos"
          type="search"
          placeholder="Buscar cliente, servicio o profesional..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-product-subtle border border-product-line rounded-2xl px-5 py-3 text-sm outline-none focus:border-product-accent transition-colors"
        />
        <select aria-label="Filtrar por profesional" className="product-field min-h-11" value={professional} onChange={event => setProfessional(event.target.value)}>
          <option value="">Todo el equipo</option>
          {professional && !professionals.has(professional) && <option value={professional}>Sin turnos en este período</option>}
          {Array.from(professionals, ([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        </div>

        {turnoEditar && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 px-4 pb-0 md:pb-4">
            <div className="w-full max-w-md bg-product-bg border border-product-line rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black italic uppercase text-lg" style={{ color: colorPrincipal }}>
                  Editar Turno
                </h3>
                <button onClick={() => setTurnoEditar(null)} className="text-product-muted hover:text-product-ink font-black">
                  X
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase text-product-muted tracking-widest block mb-1">Cliente</label>
                  <input
                    type="text"
                    value={turnoEditar.cliente_nombre}
                    onChange={(e) => setTurnoEditar({ ...turnoEditar, cliente_nombre: e.target.value })}
                    className="w-full bg-black border border-product-line rounded-xl px-4 py-3 text-sm outline-none focus:border-product-accent transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-product-muted tracking-widest block mb-1">Fecha</label>
                    <input
                      type="date"
                      value={turnoEditar.fecha}
                      onChange={(e) => setTurnoEditar({ ...turnoEditar, fecha: normalizeDateISO(e.target.value) })}
                      className="w-full bg-black border border-product-line rounded-xl px-4 py-3 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-product-muted tracking-widest block mb-1">Hora</label>
                    <input
                      type="time"
                      value={turnoEditar.hora.slice(0, 5)}
                      onChange={(e) => setTurnoEditar({ ...turnoEditar, hora: e.target.value + ':00' })}
                      className="w-full bg-black border border-product-line rounded-xl px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-product-muted tracking-widest block mb-2">Estado</label>
                  <div className="flex gap-2 flex-wrap">
                    {ESTADOS_TURNO.map((e) => (
                      <button
                        key={e==='no_asistio'?'No asistió': e==='cancelado'?'Cancelado por el negocio':e}
                        onClick={() => setTurnoEditar({ ...turnoEditar, estado: e })}
                        className={
                          'min-h-11 px-3 rounded-lg text-[9px] font-black uppercase border transition-all ' +
                          (turnoEditar.estado === e ? 'text-product-button-ink border-transparent' : 'bg-product-subtle text-product-muted border-product-line')
                        }
                        style={turnoEditar.estado === e ? { backgroundColor: colorPrincipal } : {}}
                      >
                        {e==='no_asistio'?'No asistió': e==='cancelado'?'Cancelado por el negocio':e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setTurnoEditar(null)}
                  className="flex-1 py-3 rounded-2xl font-black uppercase text-sm border border-product-line text-product-muted hover:bg-product-subtle transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarEdicion}
                  className="flex-1 py-3 rounded-2xl font-black uppercase text-sm text-product-button-ink transition-opacity hover:opacity-90"
                  style={{ backgroundColor: colorPrincipal }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {vista === 'dia' &&
          (loading ? (
            <div className="text-center py-20 font-black italic text-product-muted animate-pulse">Buscando...</div>
          ) : turnosFiltrados.length === 0 ? (
            <div className="text-center py-20 bg-product-subtle rounded-[2.5rem] border border-dashed border-product-line">
              <p className="text-product-muted font-black uppercase italic">No hay turnos para este día</p>
            </div>
          ) : (
            <div className="space-y-3">
              {turnosFiltrados.map((t) => (
                <TurnoCard key={t.id} t={t} />
              ))}
            </div>
          ))}

        {vista === 'semana' && (
          <div className="space-y-6 overflow-x-auto">
            {loading ? (
              <div className="text-center py-20 font-black italic text-product-muted animate-pulse">Buscando...</div>
            ) : (
              diasSemana.map((dia) => {
                const turnosDia = turnosPorFecha[dia.iso] ?? []
                const esHoy = dia.iso === getTodayISO()
                return (
                  <div key={dia.iso}>
                    <div className="flex items-center gap-3 mb-3">
                      <p className={'text-xs font-black uppercase tracking-widest ' + (esHoy ? '' : 'text-product-muted')} style={esHoy ? { color: colorPrincipal } : {}}>
                        {dia.label}
                      </p>
                      {turnosDia.length > 0 && (
                        <span className="text-[9px] font-black text-product-muted">
                          {turnosDia.length} turno{turnosDia.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-product-subtle" />
                    </div>
                    {turnosDia.length === 0 ? (
                      <p className="text-product-muted text-xs font-bold italic pl-2">Sin turnos</p>
                    ) : (
                      <div className="space-y-2">
                        {turnosDia.map((t) => (
                          <TurnoCard key={t.id} t={t} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}


export default function TurnosPage() {
  return <Suspense fallback={<p role="status">Cargando agenda…</p>}><AgendaTurnos /></Suspense>
}
