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
  const [nuevaNota, setNuevaNota] = useState('')
  const [notas, setNotas] = useState<any[]>([])
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
        mapa.set(key, { idString: key, nombre: partes[0]?.trim() || 'Sin nombre', telefono: partes[1]?.trim() || '', turnosTotal: 0, historial: [] })
      }
      const cli = mapa.get(key)
      cli.turnosTotal += 1
      cli.historial.push(t)
    })
    return Array.from(mapa.values())
  }, [turnos])

  const cargarNotas = async (cid: string) => {
    const { data } = await supabase.from('config').select('valor').eq('clave', `nota_${negocio.id}_${cid}`).maybeSingle()
    setNotas(data?.valor ? JSON.parse(data.valor) : [])
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white">CARGANDO...</div>
  const colorP = getThemeColor(negocio?.tema)
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || c.telefono.includes(busqueda))

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Base de <span style={{ color: colorP }}>Clientes</span></h1>
          </div>
          <input type="text" placeholder="BUSCAR..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black uppercase outline-none w-full md:w-80" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3 h-[70vh] overflow-y-auto pr-2">
            {filtrados.map(c => (
              <button key={c.idString} onClick={() => { setClienteSeleccionado(c.idString); cargarNotas(c.idString) }} className={`w-full text-left p-6 rounded-3xl border transition-all ${clienteSeleccionado === c.idString ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5'}`} style={clienteSeleccionado === c.idString ? { backgroundColor: colorP, color: '#000' } : {}}>
                <h3 className="font-black italic uppercase text-xl truncate">{c.nombre}</h3>
                <p className="text-[10px] font-black uppercase opacity-60">{c.telefono || 'S/T'} · {c.turnosTotal} Turnos</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2">
            {clienteSeleccionado ? (
              <div className="bg-white/4 border border-white/5 rounded-[3.5rem] p-10 animate-in slide-in-from-right-4 h-[70vh] overflow-y-auto">
                <h2 className="text-4xl font-black uppercase italic" style={{color: colorP}}>{clienteSeleccionado.split('·')[0]}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-500 mb-4">Notas</p>
                     <div className="space-y-3">{notas.map((n, i) => <div key={i} className="bg-white/5 p-4 rounded-2xl text-xs">{n.texto}</div>)}</div>
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase text-slate-500 mb-4">Historial</p>
                     <div className="space-y-3">{clientes.find(c=>c.idString===clienteSeleccionado).historial.map((t, i) => <div key={i} className="bg-white/5 p-4 rounded-2xl text-xs flex justify-between"><span>{t.fecha}</span><span className="font-black uppercase">{t.estado}</span></div>)}</div>
                   </div>
                </div>
              </div>
            ) : <div className="h-full border border-dashed border-white/10 rounded-[3.5rem] flex items-center justify-center text-slate-600 font-black uppercase">Seleccioná un cliente</div>}
          </div>
        </div>
      </div>
    </div>
  )
