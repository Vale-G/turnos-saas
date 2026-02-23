'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    const { data } = await supabase.from('Staff').select('*').eq('negocio_id', perfil?.negocio_id)
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const add = async () => {
    if(!nombre) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    await supabase.from('Staff').insert([{ nombre, negocio_id: perfil?.negocio_id }])
    setNombre(''); load()
  }

  const remove = async (id: string) => {
    await supabase.from('Staff').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="text-emerald-500 font-black animate-pulse">CARGANDO EQUIPO...</div>

  return (
    <div className="max-w-4xl space-y-10">
      <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Mi Equipo <span className="text-emerald-500">PRO</span></h1>
      <div className="flex gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
        <input value={nombre} onChange={e => setNombre(e.target.value)} className="flex-1 bg-black p-5 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all" placeholder="Nombre del nuevo peluquero..." />
        <button onClick={add} className="bg-emerald-500 text-black px-10 rounded-2xl font-black uppercase italic hover:scale-105 transition-all">Contratar</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staff.map(s => (
          <div key={s.id} className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-slate-800 flex justify-between items-center group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center font-black text-black text-2xl shadow-lg shadow-emerald-500/20">{s.nombre[0]}</div>
              <span className="text-2xl font-bold italic uppercase">{s.nombre}</span>
            </div>
            <button onClick={() => remove(s.id)} className="opacity-0 group-hover:opacity-100 p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">ELIMINAR</button>
          </div>
        ))}
      </div>
    </div>
  )
}
