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

  const totalIngresos = useMemo(
    () => turnos
      .filter(t => t.estado !== 'cancelado' && t.pago_estado === 'cobrado')
      .reduce((acc, t) => acc + (t.Servicio?.precio ?? 0), 0),
    [turnos]
  )

  const estadoColorClass = (estado: string) => {
    const map: Record<string, string> = {
      confirmado: 'bg-emerald-500',
      pendiente: 'bg-amber-500',
      cancelado: 'bg-rose-500',
      completado: 'bg-slate-500',
    }
    return map[estado] ?? 'bg-slate-500'
  }

  const pagoColorClass = (pagoEstado: string | null) => {
    if (pagoEstado === 'cobrado') return 'text-emerald-400'
    if (pagoEstado === 'cancelado') return 'text-red-400'
    return 'text-amber-400'
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: neg } = await supabase
        .from('Negocio').select('id, tema').eq('owner_id', user.id).single()
      if (!neg) { router.push('/dashboard'); return }
      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    let mounted = true
    async function loadTurnos() {
      setLoading(true)
      const { data } = await supabase
        .from('Turno')
        .select('*, Servicio(nombre, precio), Staff(nombre)')
        .eq('negocio_id', negocioId)
        .eq('fecha', fechaFiltro)
        .order('hora', { ascending: true })
      if (mounted) { setTurnos((data as TurnoItem[]) ?? []); setLoading(false) }
    }
    void loadTurnos()
    return () => { mounted = false }
  }, [negocioId, fechaFiltro, reloadKey])

  const moverFecha = (dias: number) => {
    const d = new Date(fechaFiltro)
    d.setDate(d.getDate() + dias)
    setFechaFiltro(d.toISOString().split('T')[0])
  }

  const cambiarEstado = useCallback(async (id: string, nuevoEstado: string) => {
    await supabase.from('Turno').update({ estado: nuevoEstado }).eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  const cambiarPago = useCallback(async (id: string, tipo: string | null, estado: string) => {
    await supabase.from('Turno').update({ pago_tipo: tipo, pago_estado: estado }).eq('id', id)
    setTurnoEditando(null)
    setReloadKey(k => k + 1)
  }, [])

  const eliminarTurno = useCallback(async (id: string) => {
    if (!confirm('Seguro que queres borrar este turno?')) return
    await supabase.from('Turno').delete().eq('id', id)
    setReloadKey(k => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
          <div className="flex-1">
            <button onClick={() => router.push('/dashboard')}
              className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">
              Volver
            </button>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
              Agenda
            </h1>

            {/* Caja */}
            <div className="mt-4 rounded-[2rem] border border-white/10 bg-white/4 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Cobrado hoy</p>
                  <p className="text-3xl font-black" style={{ color: colorPrincipal }}>${totalIngresos.toFixed(0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Turnos</p>
                  <p className="text-3xl font-black">{turnos.filter(t => t.estado !== 'cancelado').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selector fecha */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/8 p-2 rounded-2xl self-start md:mt-8">
            <button onClick={() => moverFecha(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              {'<'}
            </button>
            <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)}
              className="bg-transparent font-black uppercase italic text-sm outline-none cursor-pointer" />
            <button onClick={() => moverFecha(1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              {'>'}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 font-black italic text-slate-700 animate-pulse">Buscando turnos...</div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-20 bg-white/3 rounded-[2.5rem] border border-dashed border-white/10">
            <p className="text-slate-500 font-black uppercase italic">No hay turnos para este día</p>
          </div>
        ) : (
          <div className="space-y-3">
            {turnos.map(t => (
              <div key={t.id}
                className={`bg-white/4 border rounded-[1.75rem] overflow-hidden transition-all ${
                  t.estado === 'completado' ? 'opacity-50 border-white/5' : 'border-white/8 hover:border-white/15'
                }`}>
                {/* Fila principal */}
                <div className="p-5 flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-1 self-stretch rounded-full ${estadoColorClass(t.estado)}`} />
                    <div>
                      <p className="text-2xl font-black italic" style={{ color: colorPrincipal }}>
                        {t.hora.slice(0, 5)}
                      </p>
                    </div>
                    <div>
                      <p className="font-black uppercase text-base leading-tight">{t.cliente_nombre}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                        {t.Servicio?.nombre} — {t.Staff?.nombre}
                      </p>
                      {/* Badge pago */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase ${pagoColorClass(t.pago_estado)}`}>
                          {t.pago_estado === 'cobrado'
                            ? 'Cobrado' + (t.pago_tipo ? ' · ' + t.pago_tipo : '')
                            : t.pago_estado === 'cancelado' ? 'Cancelado'
                            : 'Sin cobrar'}
                        </span>
                        {t.Servicio?.precio && (
                          <span className="text-[9px] text-slate-600 font-bold">${t.Servicio.precio}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones rápidas */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setTurnoEditando(turnoEditando === t.id ? null : t.id)}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                      Gestionar
                    </button>
                    <button onClick={() => eliminarTurno(t.id)}
                      className="p-2 rounded-xl text-red-500/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      x
                    </button>
                  </div>
                </div>

                {/* Panel expandible de gestión */}
                {turnoEditando === t.id && (
                  <div className="border-t border-white/8 p-5 bg-white/3 space-y-4">
                    {/* Cambiar estado del turno */}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Estado del turno</p>
                      <div className="flex gap-2 flex-wrap">
                        {ESTADOS_TURNO.map(e => (
                          <button key={e}
                            onClick={() => cambiarEstado(t.id, e)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                              t.estado === e
                                ? 'text-black border-transparent'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                            style={t.estado === e ? { backgroundColor: colorPrincipal } : {}}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Registrar pago */}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Registrar pago</p>
                      <div className="flex gap-2 flex-wrap">
                        {TIPOS_PAGO.map(tipo => (
                          <button key={tipo}
                            onClick={() => cambiarPago(t.id, tipo, 'cobrado')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                              t.pago_tipo === tipo && t.pago_estado === 'cobrado'
                                ? 'bg-emerald-500 text-black border-transparent'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}>
                            {tipo === 'mercadopago' ? 'MercadoPago' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                          </button>
                        ))}
                        {t.pago_estado === 'cobrado' && (
                          <button
                            onClick={() => cambiarPago(t.id, null, 'pendiente')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                            Deshacer
                          </button>
                        )}
                      </div>
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
