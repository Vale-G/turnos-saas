'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PersonalPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [color, setColor] = useState('#10b981')
  const [nombre, setNombre] = useState('')

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()
    if (perfil?.negocio_id) {
      const { data: neg } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
      if (neg?.color_primario) setColor(neg.color_primario)
      const { data } = await supabase.from('Personal').select('*').eq('negocio_id', perfil.negocio_id)
      setStaff(data || [])
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()
    await supabase.from('Personal').insert([{ nombre, negocio_id: perfil!.negocio_id }])
    setNombre('')
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('Personal').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-black uppercase italic text-white">Equipo</h1>
      <form onSubmit={handleAdd} className="flex gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <input placeholder="Nombre del Barbero" value={nombre} onChange={e => setNombre(e.target.value)} className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <button className="px-6 font-bold rounded-xl" style={{ backgroundColor: color, color: '#00' }}>Alta</button>
      </form>
      <div className="grid md:grid-cols-2 gap-3">
        {staff.map(b => (
          <div key={b.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
            <span className="text-white font-bold">👤 {b.nombre}</span>
            <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">🗑️ Borrar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
