'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [color, setColor] = useState('#10b981')
  const [form, setForm] = useState({ nombre: '', precio: '', duracion: '30' })

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
    if (perfil?.negocio_id) {
      const { data: neg } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
      if (neg?.color_primario) setColor(neg.color_primario)
      const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
      setServicios(data || [])
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()
    await supabase.from('Servicio').insert([{ 
      nombre: form.nombre, 
      precio: parseFloat(form.precio), 
      duracion: parseInt(form.duracion), 
      negocio_id: perfil!.negocio_id 
    }])
    setForm({ nombre: '', precio: '', duracion: '30' })
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('Servicio').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-black uppercase italic text-white">Servicios</h1>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <input placeholder="Precio" type="number" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <input placeholder="Minutos" type="number" value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <button className="font-bold rounded-xl" style={{ backgroundColor: color, color: '#00' }}>Agregar</button>
      </form>
      <div className="grid gap-3">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
            <div>
              <p className="text-white font-bold">{s.nombre}</p>
              <p style={{ color: color }}>${s.precio} - {s.duracion}min</p>
            </div>
            <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors">🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
