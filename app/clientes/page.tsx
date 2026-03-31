'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type ClienteResumen = {
  id_unico: string
  cliente_id: string | null
  cliente_nombre: string
  es_invitado: boolean
  totalTurnos: number
  totalGastado: number
  ultimaVisita: string
  servicioFavorito: string
  turnos: any[]
}

export default function ClientesElite() {
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
      const { data } = await supabase
        .from('turno')
        .select('id, fecha, hora, estado, pago_estado, cliente_id, cliente_nombre, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocioId)
        .order('fecha', { ascending: false })

      if (!data) { setLoading(false); return }

      const mapa: Record<string, ClienteResumen> = {}
      
      for (const t of data as any[]) {
        const idGrupo = t.cliente_id || `invitado-${t.cliente_nombre}`
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

  const filtrados = clientes.filter(c => c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Base de <span style={{ color: colorPrincipal }}>Clientes</span></h1>
          </div>
          <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-[2rem] backdrop-blur-md">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Registros</p>
            <p className="text-3xl font-black italic">{clientes.length}</p>
          </div>
        </header>

        <input 
          type="text" 
          placeholder="BUSCAR POR NOMBRE O TELÉFONO..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-6 text-xs font-black uppercase tracking-widest outline-none focus:border-white/30 transition-all mb-10 placeholder:text-slate-700 shadow-inner" 
        />

        {loading ? (
          <div className="text-center py-20 text-slate-800 font-black italic text-3xl uppercase tracking-tighter animate-pulse">SINCRONIZANDO DATA...</div>
        ) : (
          <div className="space-y-4">
            {filtrados.map(c => (
              <div key={c.id_unico} className="bg-white/4 border border-white/8 hover:border-white/20 rounded-[3rem] overflow-hidden transition-all duration-300">
                <div 
                  className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer" 
                  onClick={() => setClienteAbierto(clienteAbierto === c.id_unico ? null : c.id_unico)}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-[2rem] flex items-center justify-center font-black text-2xl flex-shrink-0 border border-white/10 shadow-lg" style={{ background: colorPrincipal + '20', color: colorPrincipal }}>
                      {c.cliente_nombre[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-black uppercase text-xl tracking-tight">{c.cliente_nombre}</p>
                        {c.es_invitado && (
                          <span className="text-[8px] bg-white/10 text-slate-300 px-2 py-1 rounded-lg font-black uppercase tracking-widest">Invitado</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {c.servicioFavorito && `FAV: ${c.servicioFavorito} · `}
                        ULT: {c.ultimaVisita}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8 md:text-right flex-shrink-0">
                    <div><p className="font-black text-2xl italic" style={{ color: colorPrincipal }}>{c.totalTurnos}</p><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">TURNOS</p></div>
                    <div><p className="font-black text-2xl italic text-emerald-400">${c.totalGastado.toLocaleString('es-AR')}</p><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">LTV (GASTO)</p></div>
                  </div>
                </div>

                {clienteAbierto === c.id_unico && (
                  <div className="border-t border-white/5 p-8 bg-black/40 space-y-6 animate-in slide-in-from-top-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Historial de Turnos</p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
                      {c.turnos.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-2xl px-6 py-4 hover:bg-white/10 transition-colors">
                          <div>
                            <p className="text-sm font-black uppercase italic">{t.servicio?.nombre ?? 'Servicio'}</p>
                            <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">{t.fecha} · {t.hora?.slice(0, 5)} HS · {t.staff?.nombre ?? 'SIN STAFF'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black italic" style={{ color: colorPrincipal }}>${t.servicio?.precio?.toLocaleString() ?? '0'}</p>
                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${t.estado === 'completado' ? 'text-slate-500' : 'text-emerald-500'}`}>{t.estado}</p>
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
