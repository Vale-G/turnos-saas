'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function ServiciosConfig() {
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  // Formulario
  const [editId, setEditId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('30')
  const [señaTipo, setSeñaTipo] = useState('porcentaje') // porcentaje, fijo, ninguno
  const [señaValor, setSeñaValor] = useState('50')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id, tema').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
        setNegocio(n)
      } else {
        const { data: n } = await supabase.from('negocio').select('id, tema').eq('id', nId).single()
        setNegocio(n)
      }

      if (nId) {
        const { data: s } = await supabase.from('servicio').select('*').eq('negocio_id', nId).order('created_at')
        setServicios(s || [])
      }
      setLoading(false)
    }
    init()
  }, [router])

  const abrirModal = (s: any = null) => {
    if (s) {
      setEditId(s.id); setNombre(s.nombre); setPrecio(s.precio); setDuracion(s.duracion);
      setSeñaTipo(s.seña_tipo || 'porcentaje'); setSeñaValor(s.seña_valor || '50');
    } else {
      setEditId(null); setNombre(''); setPrecio(''); setDuracion('30');
      setSeñaTipo('porcentaje'); setSeñaValor('50');
    }
    setShowModal(true)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const payload = {
      negocio_id: negocio.id,
      nombre,
      precio: Number(precio),
      duracion: Number(duracion),
      seña_tipo: señaTipo,
      seña_valor: señaTipo === 'ninguno' ? 0 : Number(señaValor)
    }

    const { error } = editId 
      ? await supabase.from('servicio').update(payload).eq('id', editId)
      : await supabase.from('servicio').insert(payload)

    if (error) toast.error('Error al guardar')
    else {
      toast.success('Servicio guardado')
      setShowModal(false)
      window.location.reload()
    }
    setGuardando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white">CARGANDO SERVICIOS...</div>
  const colorP = getThemeColor(negocio?.tema)

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Mis <span style={{ color: colorP }}>Servicios</span></h1>
          </div>
          <button onClick={() => abrirModal()} className="bg-white text-black px-8 py-4 rounded-2xl font-black uppercase italic text-sm hover:scale-105 transition-all active:scale-95">Nuevo Servicio +</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {servicios.map(s => (
            <div key={s.id} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex justify-between items-center group hover:border-white/20 transition-all">
              <div>
                <h3 className="text-2xl font-black uppercase italic">{s.nombre}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                  ${s.precio} · {s.duracion} min · 
                  <span className="text-white ml-1">
                    Seña: {s.seña_tipo === 'porcentaje' ? `${s.seña_valor}%` : s.seña_tipo === 'fijo' ? `$${s.seña_valor}` : 'Sin seña'}
                  </span>
                </p>
              </div>
              <button onClick={() => abrirModal(s)} className="opacity-0 group-hover:opacity-100 bg-white/10 p-4 rounded-2xl hover:bg-white hover:text-black transition-all">✏️</button>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-[#020617] border border-white/10 p-10 rounded-[3.5rem] max-w-md w-full animate-in zoom-in-95">
              <h2 className="text-3xl font-black uppercase italic mb-8">Configurar <span style={{ color: colorP }}>Servicio</span></h2>
              <form onSubmit={guardar} className="space-y-5">
                <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Nombre</label><input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none focus:border-white/30" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Precio ($)</label><input type="number" value={precio} onChange={e=>setPrecio(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Duración (min)</label><input type="number" value={duracion} onChange={e=>setDuracion(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none" /></div>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-widest">Configuración de Seña</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['porcentaje', 'fijo', 'ninguno'].map(t => (
                      <button type="button" key={t} onClick={() => setSeñaTipo(t)} className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${señaTipo === t ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}>{t}</button>
                    ))}
                  </div>
                  {señaTipo !== 'ninguno' && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">{señaTipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto Fijo ($)'}</label>
                      <input type="number" value={señaValor} onChange={e=>setSeñaValor(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-xs font-black outline-none" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-500">Cancelar</button>
                  <button type="submit" disabled={guardando} className="flex-[2] py-4 rounded-2xl font-black uppercase italic text-black" style={{ backgroundColor: colorP }}>{guardando ? 'GUARDANDO...' : 'GUARDAR'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
