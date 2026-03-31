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
  
  // Nuevos estados para Notas y Lista Negra
  const [notas, setNotas] = useState<any[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [listaNegra, setListaNegra] = useState<string[]>([])
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
      }
      
      if (nId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', nId).single()
        setNegocio(neg)
        const { data: t } = await supabase.from('turno').select('cliente_nombre, fecha, hora, estado, servicio(nombre)').eq('negocio_id', nId).order('fecha', { ascending: false })
        setTurnos(t || [])

        // Cargar Lista Negra global del negocio
        const { data: bl } = await supabase.from('config').select('valor').eq('clave', `blacklist_${nId}`).maybeSingle()
        if (bl?.valor) setListaNegra(JSON.parse(bl.valor))
      }
      setLoading(false)
    }
    init()
  }, [router])

  const clientes = useMemo(() => {
    const mapa = new Map()
    turnos.forEach(t => {
      if (!t.cliente_nombre) return
      const key = t.cliente_nombre.trim()
      if (!mapa.has(key)) {
        const partes = key.split('·')
        mapa.set(key, { 
          idString: key, 
          nombre: partes[0]?.trim() || 'Sin nombre', 
          telefono: partes[1]?.trim() || '', 
          turnosTotal: 0, 
          historial: [] 
        })
      }
      const cli = mapa.get(key)
      cli.turnosTotal += 1
      cli.historial.push(t)
    })
    return Array.from(mapa.values())
  }, [turnos])

  const cargarNotas = async (cid: string) => {
    setNotas([])
    const { data } = await supabase.from('config').select('valor').eq('clave', `nota_${negocio?.id}_${cid}`).maybeSingle()
    if (data?.valor) setNotas(JSON.parse(data.valor))
  }

  const agregarNota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaNota.trim() || !clienteSeleccionado) return
    setGuardandoNota(true)
    
    const nuevaLista = [{ texto: nuevaNota, fecha: new Date().toLocaleDateString('es-AR') }, ...notas]
    const clave = `nota_${negocio.id}_${clienteSeleccionado}`
    
    const { error } = await supabase.from('config').upsert({ clave, valor: JSON.stringify(nuevaLista) }, { onConflict: 'clave' })
    
    setGuardandoNota(false)
    if (error) return toast.error('Error al guardar la nota')
    
    setNotas(nuevaLista)
    setNuevaNota('')
    toast.success('Nota guardada')
  }

  const toggleBloqueo = async (telefono: string) => {
    if (!telefono) return toast.error('Este cliente no tiene teléfono registrado.')
    setGuardandoBloqueo(true)
    
    let nuevaListaNegra = [...listaNegra]
    const estaBloqueado = nuevaListaNegra.includes(telefono)
    
    if (estaBloqueado) {
      nuevaListaNegra = nuevaListaNegra.filter(t => t !== telefono)
    } else {
      nuevaListaNegra.push(telefono)
    }

    const { error } = await supabase.from('config').upsert({ clave: `blacklist_${negocio.id}`, valor: JSON.stringify(nuevaListaNegra) }, { onConflict: 'clave' })
    
    setGuardandoBloqueo(false)
    if (error) return toast.error('Error al actualizar lista negra')
    
    setListaNegra(nuevaListaNegra)
    toast.success(estaBloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado (Lista Negra)')
  }

  const colorP = getThemeColor(negocio?.tema)
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda))
  const clienteData = clientes.find(c => c.idString === clienteSeleccionado)
  const estaBloqueado = clienteData ? listaNegra.includes(clienteData.telefono) : false

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase text-2xl">CARGANDO CRM...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Clientes <span style={{ color: colorP }}>CRM</span></h1>
          </div>
          <input type="text" placeholder="BUSCAR NOMBRE O TELÉFONO..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase outline-none w-full md:w-80 focus:border-white/30 transition-all" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LISTA DE CLIENTES */}
          <div className="lg:col-span-1 space-y-3 h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {filtrados.map(c => (
              <button key={c.idString} onClick={() => { setClienteSeleccionado(c.idString); cargarNotas(c.idString) }} className={`w-full text-left p-6 rounded-3xl border transition-all ${clienteSeleccionado === c.idString ? 'shadow-xl scale-[1.02]' : 'bg-white/4 border-white/5 hover:bg-white/10'}`} style={clienteSeleccionado === c.idString ? { backgroundColor: colorP, borderColor: colorP, color: '#000' } : {}}>
                <div className="flex justify-between items-start">
                  <h3 className="font-black italic uppercase text-xl truncate">{c.nombre}</h3>
                  {listaNegra.includes(c.telefono) && <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-md font-black uppercase">Bloqueado</span>}
                </div>
                <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mt-1">{c.telefono || 'S/T'} · {c.turnosTotal} Turnos</p>
              </button>
            ))}
            {filtrados.length === 0 && <p className="text-center text-slate-600 text-xs font-black uppercase mt-10 tracking-widest">No hay clientes con ese nombre</p>}
          </div>

          {/* PANEL DE DETALLE */}
          <div className="lg:col-span-2">
            {clienteSeleccionado && clienteData ? (
              <div className="bg-white/4 border border-white/5 rounded-[3.5rem] p-10 animate-in fade-in slide-in-from-right-8 h-[70vh] overflow-y-auto custom-scrollbar relative">
                
                {estaBloqueado && <div className="absolute top-0 left-0 w-full h-2 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />}
                
                {/* CABECERA DEL CLIENTE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/10">
                  <div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter" style={{color: estaBloqueado ? '#ef4444' : colorP}}>{clienteData.nombre}</h2>
                    <p className="text-slate-400 font-mono text-sm mt-2">{clienteData.telefono || 'Sin teléfono registrado'}</p>
                  </div>
                  <div className="flex gap-3">
                    {clienteData.telefono && (
                      <a href={`https://wa.me/${clienteData.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-colors flex items-center gap-2">
                        <span>💬</span> WhatsApp
                      </a>
                    )}
                    <button onClick={() => toggleBloqueo(clienteData.telefono)} disabled={guardandoBloqueo} className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 border ${estaBloqueado ? 'bg-white text-red-600 border-white hover:bg-red-50' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white'}`}>
                      {guardandoBloqueo ? '...' : (estaBloqueado ? '✅ Desbloquear' : '🚫 Lista Negra')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   {/* SECCIÓN DE NOTAS */}
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2">📝 Notas Internas</p>
                     
                     <form onSubmit={agregarNota} className="mb-6 flex gap-2">
                       <input type="text" value={nuevaNota} onChange={e=>setNuevaNota(e.target.value)} placeholder="Ej: Usa tintura rubia..." className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none focus:border-white/30" />
                       <button type="submit" disabled={guardandoNota || !nuevaNota.trim()} className="bg-white text-black px-4 rounded-2xl text-xl font-black hover:bg-slate-200 transition-colors">+</button>
                     </form>

                     <div className="space-y-3">
                       {notas.length === 0 ? <p className="text-xs text-slate-600 font-black uppercase tracking-widest italic">No hay notas.</p> : null}
                       {notas.map((n, i) => (
                         <div key={i} className="bg-amber-400/5 border border-amber-400/20 p-4 rounded-2xl text-sm relative group">
                           <p className="text-white/90">{n.texto}</p>
                           <p className="text-[9px] font-black uppercase text-amber-500/50 mt-2">{n.fecha}</p>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* SECCIÓN DE HISTORIAL */}
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 flex items-center gap-2">📅 Historial ({clienteData.turnosTotal})</p>
                     <div className="space-y-3">
                       {clienteData.historial.map((t: any, i: number) => (
                         <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-colors">
                           <div>
                             <p className="text-xs font-black uppercase">{t.servicio?.nombre || 'Servicio'}</p>
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{t.fecha} - {t.hora.slice(0,5)}</p>
                           </div>
                           <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${t.estado === 'completado' ? 'bg-emerald-500/20 text-emerald-400' : t.estado === 'cancelado' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                             {t.estado}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full border border-dashed border-white/10 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-600 p-10 text-center">
                <span className="text-5xl mb-4">📇</span>
                <h3 className="text-xl font-black uppercase italic">Seleccioná un cliente</h3>
                <p className="text-xs font-black uppercase tracking-widest mt-2 opacity-50">Para ver su historial y notas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
