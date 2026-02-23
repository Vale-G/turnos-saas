'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
    const { data } = await supabase.from('Staff').select('*').eq('negocio_id', perfil?.negocio_id)
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const agregar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    await supabase.from('Staff').insert([{ nombre: nuevoNombre, negocio_id: perfil?.negocio_id }])
    setNuevoNombre('')
    load()
  }

  if (loading) return <div className="p-10 text-white animate-pulse">Cargando equipo...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black uppercase italic text-white text-emerald-500">Mi Equipo</h1>
      <div className="flex gap-4 bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
        <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="flex-1 bg-black p-4 rounded-xl text-white border border-slate-800 outline-none" placeholder="Nombre del barbero" />
        <button onClick={agregar} className="bg-emerald-500 text-black px-8 py-4 rounded-xl font-black uppercase italic">Agregar</button>
      </div>
      <div className="grid gap-4">
        {staff.map(s => (
          <div key={s.id} className="bg-slate-900/50 p-6 rounded-[1.5rem] border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center font-black text-black">{s.nombre[0]}</div>
            <span className="font-bold text-xl uppercase italic">{s.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
