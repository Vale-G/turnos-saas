'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type ClienteResumen = {
  cliente_id: string
  cliente_nombre: string
  totalTurnos: number
  totalGastado: number
  ultimaVisita: string
  servicioFavorito: string
  turnos: TurnoCliente[]
}

type TurnoCliente = {
  id: string
  fecha: string
  hora: string
  estado: string
  pago_estado: string | null
  Servicio?: { nombre: string; precio: number }
  Staff?: { nombre: string }
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [busqueda, setBusqueda] = useState('')
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let neg = null
      const { data: byOwner } = await supabase.from('Negocio').select('id, tema').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else {
        const { data: byId } = await supabase.from('Negocio').select('id, tema').eq('id', user.id).single()
        neg = byId
      }
      if (!neg) { router.push('/dashboard'); return }
      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    async function cargar() {
      setLoading(true)
      const { data } = await supabase
        .from('Turno')
        .select('id, fecha, hora, estado, pago_estado, cliente_id, cliente_nombre, Servicio(nombre, precio), Staff(nombre)')
        .eq('negocio_id', negocioId)
        .not('cliente_id', 'is', null)
        .order('fecha', { ascending: false })

      if (!data) { setLoading(false); return }

      // Agrupar por cliente_id
      const mapa: Record<string, ClienteResumen> = {}
      for (const t of data as unknown as (TurnoCliente & { cliente_id: string; cliente_nombre: string })[]) {
        if (!mapa[t.cliente_id]) {
          mapa[t.cliente_id] = {
            cliente_id: t.cliente_id,
            cliente_nombre: t.cliente_nombre ?? 'Cliente',
            totalTurnos: 0,
            totalGastado: 0,
            ultimaVisita: t.fecha,
            servicioFavorito: '',
            turnos: [],
          }
        }
        const c = mapa[t.cliente_id]
        c.turnos.push(t)
        if (t.estado !== 'cancelado') c.totalTurnos++
        if (t.pago_estado === 'cobrado') c.totalGastado += t.Servicio?.precio ?? 0
      }

      // Servicio favorito
      for (const c of Object.values(mapa)) {
        const freq: Record<string, number> = {}
        c.turnos.forEach(t => {
          if (t.Servicio?.nombre) freq[t.Servicio.nombre] = (freq[t.Servicio.nombre] ?? 0) + 1
        })
        c.servicioFavorito = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
        c.ultimaVisita = c.turnos[0]?.fecha ?? ''
      }

      setClientes(Object.values(mapa).sort((a, b) => b.totalTurnos - a.totalTurnos))
      setLoading(false)
    }
    cargar()
  }, [negocioId])

  const guardarNota = useCallback(async (clienteId: string, clienteNombre: string) => {
    if (!negocioId || !nota.trim()) return
    setGuardandoNota(true)
    await supabase.from('ClienteNota').insert({
      negocio_id: negocioId,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      nota: nota.trim(),
    })
    setNota('')
    setGuardandoNota(false)
  }, [negocioId, nota])

  const filtrados = clientes.filter(c =>
    c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const toggleBlacklist = async (clienteId: string, estadoActual: boolean) => {
    if (!negocioId) return
    const nuevoEstado = !estadoActual
    await supabase.from('ClienteNota')
      .upsert({
        negocio_id: negocioId,
        cliente_id: clienteId,
        cliente_nombre: clientes.find(c => c.cliente_id === clienteId)?.cliente_nombre ?? '',
        bloqueado: nuevoEstado,
      }, { onConflict: 'negocio_id,cliente_id' })
    setClientes(prev => prev.map(c =>
      c.cliente_id === clienteId ? { ...c, bloqueado: nuevoEstado } : c
    ))
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">
            Volver
          </button>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
            Clientes
          </h1>
          <p className="text-slate-500 text-xs mt-1">{clientes.length} clientes únicos</p>
        </div>

        <input type="text" placeholder="Buscar cliente..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-white/25 transition-colors mb-6" />

        {loading ? (
          <div className="text-center py-20 text-slate-700 font-black italic animate-pulse">Cargando clientes...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-slate-600 font-black italic">No hay clientes todavía.</div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(c => (
              <div key={c.cliente_id}
                className="bg-white/4 border border-white/8 hover:border-white/15 rounded-2xl overflow-hidden transition-all">

                {/* Header del cliente */}
                <div className="p-5 flex items-center justify-between gap-4"
                  onClick={() => setClienteAbierto(clienteAbierto === c.cliente_id ? null : c.cliente_id)}
                  style={{ cursor: 'pointer' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base flex-shrink-0"
                      style={{ background: colorPrincipal + '20', color: colorPrincipal }}>
                      {c.cliente_nombre[0]?.toUpperCase() ?? 'C'}
                    </div>
                    <div>
                      <p className="font-black uppercase text-sm">{c.cliente_nombre}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {c.servicioFavorito && 'Favorito: ' + c.servicioFavorito + ' · '}
                        Última visita: {c.ultimaVisita}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="font-black text-base" style={{ color: colorPrincipal }}>{c.totalTurnos}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">turnos</p>
                    </div>
                    <div>
                      <p className="font-black text-base text-emerald-400">${c.totalGastado.toLocaleString('es-AR')}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">gastado</p>
                    </div>
                  </div>
                </div>

                {/* Panel expandido */}
                {clienteAbierto === c.cliente_id && (
                  <div className="border-t border-white/8 p-5 bg-black/20 space-y-4">
                    {/* Historial de turnos */}
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Historial</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {c.turnos.map(t => (
                        <div key={t.id}
                          className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-2.5">
                          <div>
                            <p className="text-xs font-black">{t.Servicio?.nombre ?? 'Servicio'}</p>
                            <p className="text-[10px] text-slate-500">{t.fecha} · {t.hora?.slice(0, 5)} · {t.Staff?.nombre ?? ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black" style={{ color: colorPrincipal }}>
                              {t.Servicio?.precio ? '$' + t.Servicio.precio : ''}
                            </p>
                            <p className={'text-[9px] font-black ' +
                              (t.estado === 'completado' ? 'text-slate-400' :
                               t.estado === 'cancelado' ? 'text-red-400' : 'text-amber-400')}>
                              {t.estado}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Agregar nota */}
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Agregar nota</p>
                      <div className="flex gap-2">
                        <input type="text" value={nota} onChange={e => setNota(e.target.value)}
                          placeholder="Ej: Prefiere no hablar mucho, alergia a..."
                          className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-white/25 transition-colors" />
                        <button onClick={() => guardarNota(c.cliente_id, c.cliente_nombre)}
                          disabled={guardandoNota || !nota.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase text-black transition-all disabled:opacity-40"
                          style={{ backgroundColor: colorPrincipal }}>
                          Guardar
                        </button>
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
