'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type TurnoItem = {
  id: string
  hora: string
  cliente_nombre: string
  estado: string
  fecha: string
  pago_tipo: string | null
  pago_estado: string | null
  Servicio?: { nombre: string; precio: number }
  Staff?: { nombre: string }
}

const ESTADOS_TURNO = ['pendiente', 'confirmado', 'completado', 'cancelado']
const TIPOS_PAGO = ['efectivo', 'mercadopago', 'transferencia', 'otro']

export default function AgendaTurnos() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [reloadKey, setReloadKey] = useState(0)
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const router = useRouter()

  const totalCobrado = useMemo(
    () => turnos
      .filter(t => t.pago_estado === 'cobrado')
      .reduce((acc, t) => acc + (t.Servicio?.precio ?? 0), 0),
    [turnos]
  )

  const estadoColor = (estado: string) => {
    const map: Record<string, string> = {
      confirmado: 'bg-emerald-500',
      pendiente: 'bg-amber-500',
      cancelado: 'bg-rose-500',
      completado: 'bg-slate-400',
    }
    return map[estado] ?? 'bg-slate-500'
  }

  // Cargar negocio del usuario logueado
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Buscar por owner_id (columna recien agregada) O por id (diseño viejo)
      let neg = null
      const { data: byOwner } = await supabase
        .from('Negocio').select('id, tema').eq('owner_id', user.id).single()
      if (byOwner) {
        neg = byOwner
      } else {
        const { data: byId } = await supabase
          .from('Negocio').select('id, tema').eq('id', user.id).single()
        neg = byId
      }

      if (!neg) { router.push('/dashboard'); return }
      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  // Cargar turnos
  useEffect(() => {
    if (!negocioId) return
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('Turno')
        .select('*, Servicio(nombre, precio), Staff(nombre)')
        .eq('negocio_id', negocioId)
        .eq('fecha', fechaFiltro)
        .order('hora', { ascending: true })
      if (mounted) {
        setTurnos((data as TurnoItem[]) ?? [])
        setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [negocioId, fechaFiltro, reloadKey])

  const moverFecha = (dias: number) => {
    const d = new Date(fechaFiltro + 'T12:00:00')
    d.setDate(d.getDate() + dias)
    setFechaFiltro(d.toISOString().split('T')[0])
  }

  const cambiarEstado = useCallback(async (id: string, nuevoEstado: string) => {
    await supabase.from('Turno').update({ estado: nuevoEstado }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const registrarPago = useCallback(async (id: string, tipo: string) => {
    await supabase.from('Turno').update({
      pago_tipo: tipo,
      pago_estado: 'cobrado',
      estado: 'completado',
    }).eq('id', id)
    setTurnoEditando(null)
    setReloadKey(k => k + 1)
  }, [])

  const deshacerPago = useCallback(async (id: string) => {
    await supabase.from('Turno').update({
      pago_tipo: null,
      pago_estado: 'pendiente',
    }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const eliminarTurno = useCallback(async (id: string) => {
    if (!confirm('Seguro que queres borrar este turno?')) return
    await supabase.from('Turno').delete().eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">
              Volver
            </button>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
              Agenda
            </h1>
            {/* Caja del día */}
            <div className="mt-4 bg-white/4 border border-white/8 rounded-2xl p-4 flex gap-6">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Cobrado</p>
                <p className="text-2xl font-black" style={{ color: colorPrincipal }}>${totalCobrado}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Turnos</p>
                <p className="text-2xl font-black">{turnos.filter(t => t.estado !== 'cancelado').length}</p>
              </div>
              <div className="w-px bg-white/10" />
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Pendientes</p>
                <p className="text-2xl font-black text-amber-400">
                  {turnos.filter(t => t.pago_estado !== 'cobrado' && t.estado !== 'cancelado').length}
                </p>
              </div>
            </div>
          </div>

          {/* Selector fecha */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 p-1.5 rounded-2xl self-start md:mt-8">
            <button onClick={() => moverFecha(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-black">
              {'<'}
            </button>
            <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)}
              className="bg-transparent font-black text-sm outline-none cursor-pointer px-1" />
            <button onClick={() => moverFecha(1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-sm font-black">
              {'>'}
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-20 font-black italic text-slate-700 animate-pulse">
            Buscando turnos...
          </div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-20 bg-white/3 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-slate-500 font-black uppercase italic">No hay turnos para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {turnos.map(t => (
              <div key={t.id}
                className={'rounded-[1.75rem] border overflow-hidden transition-all ' +
                  (t.estado === 'cancelado' ? 'opacity-40 border-white/5 bg-white/2' : 'border-white/8 bg-white/4 hover:border-white/15')}>

                {/* Fila principal */}
                <div className="p-4 flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <div className={'w-1 h-12 rounded-full flex-shrink-0 ' + estadoColor(t.estado)} />
                    <p className="text-xl font-black italic w-14 flex-shrink-0" style={{ color: colorPrincipal }}>
                      {t.hora.slice(0, 5)}
                    </p>
                    <div>
                      <p className="font-black uppercase text-sm leading-tight">{t.cliente_nombre}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {t.Servicio?.nombre} · {t.Staff?.nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {t.pago_estado === 'cobrado' ? (
                          <span className="text-[9px] font-black uppercase text-emerald-400">
                            {'Cobrado · ' + (t.pago_tipo ?? '')}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-amber-400">Sin cobrar</span>
                        )}
                        {t.Servicio?.precio && (
                          <span className="text-[9px] text-slate-600 font-bold">${t.Servicio.precio}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setTurnoEditando(turnoEditando === t.id ? null : t.id)}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex-shrink-0">
                    {turnoEditando === t.id ? 'Cerrar' : 'Gestionar'}
                  </button>
                </div>

                {/* Panel gestión */}
                {turnoEditando === t.id && (
                  <div className="border-t border-white/8 p-4 bg-black/20 space-y-4">

                    {/* Estado */}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                        Estado del turno
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {ESTADOS_TURNO.map(e => (
                          <button key={e} onClick={() => cambiarEstado(t.id, e)}
                            className={'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ' +
                              (t.estado === e
                                ? 'text-black border-transparent'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}
                            style={t.estado === e ? { backgroundColor: colorPrincipal } : {}}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pago */}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                        Registrar cobro
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {TIPOS_PAGO.map(tipo => (
                          <button key={tipo} onClick={() => registrarPago(t.id, tipo)}
                            className={'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ' +
                              (t.pago_tipo === tipo && t.pago_estado === 'cobrado'
                                ? 'bg-emerald-500 text-black border-transparent'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30')}>
                            {tipo === 'mercadopago' ? 'MercadoPago' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                          </button>
                        ))}
                        {t.pago_estado === 'cobrado' && (
                          <button onClick={() => deshacerPago(t.id)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                            Deshacer
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Eliminar */}
                    <div className="flex justify-end">
                      <button onClick={() => eliminarTurno(t.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-red-500/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                        Eliminar turno
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
