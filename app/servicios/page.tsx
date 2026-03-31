'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

export default function ServiciosElite() {
  const [servicios, setServicios] = useState<any[]>([])
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('30')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: neg } = await supabase.from('negocio').select('*').eq('owner_id', user.id).single()
      if (!neg) return router.push('/onboarding')
      setNegocio(neg)
      
      const { data: svcs } = await supabase.from('servicio').select('*').eq('negocio_id', neg.id).order('precio', { ascending: false })
      setServicios(svcs || [])
      setLoading(false)
    }
    init()
  }, [router])

  const colorP = getThemeColor(negocio?.tema)

  const agregar = async (e: any) => {
    e.preventDefault()
    if (!nombre || !precio) return
    const { data } = await supabase.from('servicio').insert({
      nombre, precio: Number(precio), duracion: Number(duracion), negocio_id: negocio.id
    }).select().single()
    if (data) {
      setServicios([data, ...servicios])
      setNombre(''); setPrecio(''); setDuracion('30')
    }
  }

  const eliminar = async (id: string) => {
    if(!confirm('¿Seguro que querés eliminar este servicio?')) return
    await supabase.from('servicio').delete().eq('id', id)
    setServicios(servicios.filter(s => s.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-2xl animate-pulse tracking-tighter">CARGANDO...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Menú de <span style={{color: colorP}}>Servicios</span></h1>
        </header>

        <form onSubmit={agregar} className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3.5rem] mb-12 flex flex-col md:flex-row gap-4 items-end backdrop-blur-md shadow-2xl">
          <div className="w-full">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Nombre del Servicio</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="EJ: CORTE + BARBA" className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" required />
          </div>
          <div className="w-full md:w-32">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Precio ($)</label>
            <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="5000" className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" required />
          </div>
          <div className="w-full md:w-32">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 block">Tiempo</label>
            <select value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all text-white">
              <option value="15">15 MIN</option>
              <option value="30">30 MIN</option>
              <option value="45">45 MIN</option>
              <option value="60">1 HORA</option>
              <option value="90">1.5 HORAS</option>
              <option value="120">2 HORAS</option>
            </select>
          </div>
          <button className="w-full md:w-auto px-10 py-5 rounded-[2rem] font-black uppercase italic text-black hover:scale-105 transition-all shadow-xl" style={{backgroundColor: colorP}}>Agregar +</button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {servicios.length === 0 ? (
            <div className="col-span-2 text-center py-20 border border-dashed border-white/10 rounded-[3rem]">
               <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Aún no hay servicios creados</p>
            </div>
          ) : servicios.map(s => (
            <div key={s.id} className="bg-white/4 border border-white/5 p-8 rounded-[3rem] flex justify-between items-center group hover:bg-white/10 hover:border-white/20 transition-all">
               <div>
                 <p className="text-2xl font-black uppercase italic tracking-tight" style={{color: colorP}}>{s.nombre}</p>
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">{s.duracion} MINUTOS</p>
               </div>
               <div className="text-right flex flex-col items-end">
                 <p className="text-2xl font-black italic">${s.precio.toLocaleString('es-AR')}</p>
                 <button onClick={() => eliminar(s.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 font-black text-[9px] uppercase tracking-widest transition-all mt-1 bg-rose-500/10 px-2 py-1 rounded-md hover:bg-rose-500/20">Eliminar</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
