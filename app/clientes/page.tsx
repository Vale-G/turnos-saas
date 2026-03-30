'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type ClienteResumen = {
  id_unico: string // Puede ser UUID o Nombre
  cliente_id: string | null
  cliente_nombre: string
  es_invitado: boolean
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
  servicio?: { nombre: string; precio: number }
  staff?: { nombre: string }
}

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [busqueda, setBusqueda] = useState('')
  const [clienteAbierto, setClienteAbierto] = useState<string | null>(null)
  const router = useRouter()

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
    async function cargar() {
      setLoading(true)
      // QUITAMOS EL FILTRO NOT NULL PARA TRAER INVITADOS
      const { data } = await supabase
        .from('turno')
        .select('id, fecha, hora, estado, pago_estado, cliente_id, cliente_nombre, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: false })

      if (!data) { setLoading(false); return }

      const mapa: Record<string, ClienteResumen> = {}
      
      for (const t of data as any[]) {
        // Generamos un ID único: si no tiene ID de usuario, usamos su nombre
        const idGrupo = t.cliente_id || 'inv-' + t.cliente_nombre || `invitado-${t.cliente_nombre}`
        
        if (!mapa[idGrupo]) {
          mapa[idGrupo] = {
            id_unico: idGrupo,
            cliente_id: t.cliente_id,
            cliente_nombre: t.cliente_nombre ?? 'Cliente sin nombre',
            es_invitado: !t.cliente_id,
            totalTurnos: 0,
            totalGastado: 0,
            ultimaVisita: t.fecha,
            servicioFavorito: '',
            turnos: [],
          }
        }
        
        const c = mapa[idGrupo]
        c.turnos.push(t)
        if (t.estado !== 'cancelado') c.totalTurnos++
        if (t.pago_estado === 'cobrado') c.totalGastado += t.servicio?.precio ?? 0
      }

      // Calcular favoritos y ordenar
      for (const c of Object.values(mapa)) {
        const freq: Record<string, number> = {}
        c.turnos.forEach(t => {
          if (t.servicio?.nombre) freq[t.servicio.nombre] = (freq[t.servicio.nombre] ?? 0) + 1
        })
        c.servicioFavorito = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
        c.ultimaVisita = c.turnos[0]?.fecha ?? ''
      }

      setClientes(Object.values(mapa).sort((a, b) => b.totalTurnos - a.totalTurnos))
      setLoading(false)
    }
    cargar()
  }, [negocioId])

  const filtrados = clientes.filter(c => 
    c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">Volver</button>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>Clientes</h1>
          <p className="text-slate-500 text-xs mt-1">{clientes.length} clientes en total (incluyendo invitados)</p>
        </div>

        <input 
          type="text" 
          placeholder="Buscar por nombre..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-white/25 transition-colors mb-6" 
        />

        {loading ? (
          <div className="text-center py-20 text-slate-700 font-black italic animate-pulse">Cargando base de datos...</div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(c => (
              <div key={c.id_unico} className="bg-white/4 border border-white/8 hover:border-white/15 rounded-2xl overflow-hidden transition-all">
                <div 
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer" 
                  onClick={() => setClienteAbierto(clienteAbierto === c.id_unico ? null : c.id_unico)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base flex-shrink-0" style={{ background: colorPrincipal + '20', color: colorPrincipal }}>
                      {c.cliente_nombre[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black uppercase text-sm">{c.cliente_nombre}</p>
                        {c.es_invitado && (
                          <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Invitado</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {c.servicioFavorito && `Favorito: ${c.servicioFavorito} · `}
                        Última visita: {c.ultimaVisita}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right flex-shrink-0">
                    <div><p className="font-black text-base" style={{ color: colorPrincipal }}>{c.totalTurnos}</p><p className="text-[9px] text-slate-500 uppercase font-bold">turnos</p></div>
                    <div><p className="font-black text-base text-emerald-400">${c.totalGastado.toLocaleString('es-AR')}</p><p className="text-[9px] text-slate-500 uppercase font-bold">gastado</p></div>
                  </div>
                </div>

                {clienteAbierto === c.id_unico && (
                  <div className="border-t border-white/8 p-5 bg-black/20 space-y-4">
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Historial de Turnos</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {c.turnos.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-2.5">
                          <div>
                            <p className="text-xs font-black">{t.servicio?.nombre ?? 'Servicio'}</p>
                            <p className="text-[10px] text-slate-500">{t.fecha} · {t.hora?.slice(0, 5)} · {t.staff?.nombre ?? 'Sin asignar'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black" style={{ color: colorPrincipal }}>${t.servicio?.precio?.toLocaleString() ?? '0'}</p>
                            <p className={`text-[9px] font-black uppercase ${t.estado === 'completado' ? 'text-slate-500' : 'text-emerald-500'}`}>{t.estado}</p>
                          </div>
                        </div>
                      ))}
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
