'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function ClientesCRM() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null)
  
  // Estado para la nueva nota
  const [nuevaNota, setNuevaNota] = useState('')
  const [notas, setNotas] = useState<any[]>([])
  
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).single()
      let negId = adm?.negocio_id
      if (!negId && adm?.role !== 'superadmin') {
         const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).single()
         if (n) negId = n.id
      }

      if (negId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', negId).single()
        setNegocio(neg)
        
        // Cargamos todos los turnos para extraer los clientes únicos
        const { data: t } = await supabase.from('turno').select('cliente_nombre, fecha, hora, estado, servicio(nombre)').eq('negocio_id', negId).order('fecha', { ascending: false })
        setTurnos(t || [])
      }
      setLoading(false)
    }
    init()
  }, [router])

  // Agrupamos los turnos por el "Nombre · Telefono" del cliente
  const clientes = useMemo(() => {
    const mapa = new Map()
    turnos.forEach(t => {
      if (!t.cliente_nombre) return
      const key = t.cliente_nombre.trim()
      if (!mapa.has(key)) {
        const partes = key.split('·')
        mapa.set(key, {
          idString: key,
          nombre: partes[0]?.trim() || 'Desconocido',
          telefono: partes[1]?.trim() || '',
          turnosTotal: 0,
          ultimoTurno: t.fecha,
          historial: []
        })
      }
      const cli = mapa.get(key)
      cli.turnosTotal += 1
      cli.historial.push(t)
    })
    return Array.from(mapa.values())
  }, [turnos])

  const cargarNotas = async (clienteId: string) => {
    const { data } = await supabase.from('config').select('valor').eq('clave', `nota_${negocio.id}_${clienteId}`).single()
    if (data && data.valor) {
      setNotas(JSON.parse(data.valor))
    } else {
      setNotas([])
    }
  }

  const guardarNota = async () => {
    if (!nuevaNota.trim() || !clienteSeleccionado) return
    const nueva = { fecha: new Date().toISOString().split('T')[0], texto: nuevaNota }
    const actualizadas = [nueva, ...notas]
    
    // Guardamos la nota en la tabla config usando una clave compuesta
    await supabase.from('config').upsert({
      clave: `nota_${negocio.id}_${clienteSeleccionado}`,
      valor: JSON.stringify(actualizadas),
      descripcion: `Notas CRM del cliente ${clienteSeleccionado}`
    }, { onConflict: 'clave' })
    
    setNotas(actualizadas)
    setNuevaNota('')
    toast.success('Nota guardada')
  }

  const abrirWhatsApp = (tel: string, nombre: string) => {
    const t = tel.replace(/\D/g, '')
    if (!t) return toast.error('No hay un teléfono válido')
    window.open(`https://wa.me/${t}?text=Hola ${nombre}, te escribimos de ${negocio?.nombre}`, '_blank')
  }

  const colorP = getThemeColor(negocio?.tema)
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda))

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse">CARGANDO CRM...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Base de <span style={{ color: colorP }}>Clientes</span></h1>
          </div>
          <div className="bg-white/5 border border-white/10 p-2 rounded-[2rem] w-full md:w-80">
             <input type="text" placeholder="BUSCAR POR NOMBRE O TEL..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full bg-transparent p-4 text-xs font-black uppercase tracking-widest outline-none" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LISTA DE CLIENTES */}
          <div className="lg:col-span-1 space-y-3 h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
            {filtrados.length === 0 ? <p className="text-center py-10 text-slate-600 font-black text-xs uppercase tracking-widest border border-dashed border-white/10 rounded-[2rem]">Sin clientes aún</p> : filtrados.map(c => (
              <button key={c.idString} onClick={() => { setClienteSeleccionado(c.idString); cargarNotas(c.idString) }} className={`w-full text-left p-6 rounded-[2.5rem] border transition-all ${clienteSeleccionado === c.idString ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5 hover:border-white/20'}`} style={clienteSeleccionado === c.idString ? { backgroundColor: colorP, color: '#000' } : {}}>
                <h3 className="font-black italic uppercase text-xl truncate">{c.nombre}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${clienteSeleccionado === c.idString ? 'text-black/60' : 'text-slate-500'}`}>{c.telefono || 'Sin teléfono'} · {c.turnosTotal} Turnos</p>
              </button>
            ))}
          </div>

          {/* PANEL DE DETALLES DEL CLIENTE (CRM) */}
          <div className="lg:col-span-2">
            {clienteSeleccionado ? (() => {
              const cli = clientes.find(c => c.idString === clienteSeleccionado)
              if (!cli) return null
              return (
                <div className="bg-white/4 border border-white/5 rounded-[3.5rem] p-10 animate-in slide-in-from-right-8 h-[70vh] overflow-y-auto scrollbar-hide">
                  <div className="flex justify-between items-start mb-8 pb-8 border-b border-white/5">
                    <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter" style={{color: colorP}}>{cli.nombre}</h2>
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">{cli.telefono}</p>
                    </div>
                    {cli.telefono && (
                      <button onClick={() => abrirWhatsApp(cli.telefono, cli.nombre)} className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-2xl hover:bg-emerald-500/20 hover:scale-105 transition-all shadow-lg" title="Enviar Promoción por WhatsApp">💬</button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* NOTAS PRIVADAS */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Notas Privadas</p>
                      <div className="bg-black/40 border border-white/5 rounded-3xl p-4 mb-6">
                        <textarea value={nuevaNota} onChange={e => setNuevaNota(e.target.value)} placeholder="Ej: Le gusta el corte degradado, no usar navaja." className="w-full bg-transparent text-xs font-bold outline-none resize-none h-20 placeholder:text-slate-700" />
                        <button onClick={guardarNota} disabled={!nuevaNota.trim()} className="w-full mt-2 py-3 rounded-xl bg-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white/20 disabled:opacity-50 transition-all">Guardar Nota</button>
                      </div>
                      <div className="space-y-3">
                        {notas.length === 0 ? <p className="text-[10px] text-slate-600 font-bold uppercase italic">Sin notas aún.</p> : notas.map((n, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{n.texto}</p>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{n.fecha}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* HISTORIAL DE TURNOS */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">Historial de Turnos ({cli.turnosTotal})</p>
                      <div className="space-y-3">
                        {cli.historial.slice(0, 10).map((t: any, i: number) => (
                          <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black uppercase italic">{t.servicio?.nombre || 'Servicio eliminado'}</p>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{t.fecha} · {t.hora.slice(0,5)} HS</p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${t.estado === 'completado' ? 'bg-emerald-500/20 text-emerald-400' : t.estado === 'cancelado' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-400'}`}>{t.estado}</span>
                          </div>
                        ))}
                        {cli.turnosTotal > 10 && <p className="text-[10px] text-slate-500 font-black text-center pt-2">Ver turnos antiguos en Informes</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })() : (
              <div className="h-[70vh] border border-dashed border-white/10 rounded-[3.5rem] flex items-center justify-center text-center p-10">
                <div>
                  <div className="text-6xl mb-6 opacity-20">👤</div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-500">Seleccioná un cliente<br/>para ver su perfil</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
