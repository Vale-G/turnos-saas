'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function GestionServicios() {
  const [servicios, setServicios] = useState<any[]>([])
  const [nuevo, setNuevo] = useState({ nombre: '', precio: '', duracion: 30 })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil?.negocio_id)
    setServicios(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const agregar = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    await supabase.from('Servicio').insert([{ ...nuevo, negocio_id: perfil?.negocio_id }])
    setNuevo({ nombre: '', precio: '', duracion: 30 })
    load()
  }

  const borrar = async (id: string) => {
    if(confirm('¿Borrar este servicio?')) {
      await supabase.from('Servicio').delete().eq('id', id)
      load()
    }
  }

  if (loading) return <div className="p-10 text-white italic animate-pulse">CARGANDO SERVICIOS...</div>

  return (
    <div className="space-y-8 pb-20">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter text-emerald-500">Servicios Barbucho</h1>
      <form onSubmit={agregar} className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-2xl">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nombre</label>
          <input value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} className="w-full bg-black p-4 rounded-xl text-white border border-slate-800 outline-none focus:border-emerald-500" placeholder="Ej: Corte Pro" required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Precio ($)</label>
          <input type="number" value={nuevo.precio} onChange={e => setNuevo({...nuevo, precio: e.target.value})} className="w-full bg-black p-4 rounded-xl text-white border border-slate-800 outline-none focus:border-emerald-500" placeholder="12000" required />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Duración</label>
          <select value={nuevo.duracion} onChange={e => setNuevo({...nuevo, duracion: parseInt(e.target.value)})} className="w-full bg-black p-4 rounded-xl text-white border border-slate-800 outline-none">
            <option value={30}>30 MIN</option>
            <option value={60}>1 HORA</option>
            <option value={90}>1:30 HS</option>
          </select>
        </div>
        <button className="bg-emerald-500 text-black py-4 rounded-xl font-black uppercase italic hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">Agregar</button>
      </form>
      <div className="grid gap-4">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900/50 p-6 rounded-[1.5rem] border border-slate-800 flex justify-between items-center group hover:border-emerald-500/50 transition-all">
            <div>
              <p className="font-black text-xl text-white uppercase italic">{s.nombre}</p>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">${s.precio} • {s.duracion} MINUTOS</p>
            </div>
            <button onClick={() => borrar(s.id)} className="p-4 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
