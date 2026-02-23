'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PaginaServicios() {
  const [servicios, setServicios] = useState<any[]>([])
  const [form, setForm] = useState({ nombre: '', precio: '', duracion: 30 })

  const cargarServicios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', p?.negocio_id)
    setServicios(data || [])
  }

  useEffect(() => { cargarServicios() }, [])

  const guardar = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: p } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    await supabase.from('Servicio').insert([{ ...form, negocio_id: p?.negocio_id }])
    setForm({ nombre: '', precio: '', duracion: 30 })
    cargarServicios()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestionar Servicios</h1>
      <form onSubmit={guardar} className="flex gap-4 mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="bg-black p-2 rounded border border-slate-700 text-white" required />
        <input placeholder="Precio" type="number" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="bg-black p-2 rounded border border-slate-700 text-white" required />
        <select value={form.duracion} onChange={e => setForm({...form, duracion: parseInt(e.target.value)})} className="bg-black p-2 rounded border border-slate-700 text-white">
          <option value={30}>30 min</option>
          <option value={60}>1 hora</option>
        </select>
        <button className="bg-emerald-500 text-black px-4 py-2 rounded font-bold">Agregar</button>
      </form>

      <div className="grid gap-2">
        {servicios.map(s => (
          <div key={s.id} className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
            <span>{s.nombre} - ${s.precio} ({s.duracion} min)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
