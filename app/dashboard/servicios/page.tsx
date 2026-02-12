'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ id: '', nombre: '', precio: '', duracion: '30' })
  const [editando, setEditando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', session.user.id).single()
      
      if (perfil?.negocio_id) {
        const { data, error } = await supabase.from('Servicio')
          .select('*')
          .eq('negocio_id', perfil.negocio_id)
        
        if (error) {
          console.error("Error de Supabase:", error.message)
        } else {
          setServicios(data || [])
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    const payload = { 
      nombre: form.nombre, 
      precio: parseFloat(form.precio),
      duracion: parseInt(form.duracion),
      negocio_id: perfil?.negocio_id
    }

    const { error } = editando 
      ? await supabase.from('Servicio').update(payload).eq('id', form.id)
      : await supabase.from('Servicio').insert([payload])
    
    if (error) {
      alert("Error: " + error.message)
    } else {
      setForm({ id: '', nombre: '', precio: '', duracion: '30' })
      setEditando(false)
      setTimeout(load, 500) // Un pequeño delay para que la DB se asiente
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-black text-white italic uppercase">Servicios</h1>
      
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 grid gap-4 md:grid-cols-4 items-end">
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <input placeholder="Precio" type="number" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <input placeholder="Minutos" type="number" value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white" required />
        <button className="bg-emerald-500 text-black font-bold p-3 rounded-xl uppercase hover:scale-105 transition-all">
          {editando ? 'Actualizar' : 'Guardar'}
        </button>
      </form>

      <div className="grid gap-3 mt-8">
        {loading ? (
          <p className="text-slate-500 animate-pulse font-bold uppercase italic">Buscando servicios...</p>
        ) : servicios.length === 0 ? (
          <p className="text-slate-600 italic">No se encontraron servicios cargados.</p>
        ) : (
          servicios.map(s => (
            <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group">
              <div>
                <p className="font-bold text-white">{s.nombre}</p>
                <p className="text-emerald-500 font-black">${s.precio} - {s.duracion} min</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setForm({id: s.id, nombre: s.nombre, precio: s.precio.toString(), duracion: s.duracion.toString()}); setEditando(true); }} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">✏️</button>
                <button onClick={async () => { await supabase.from('Servicio').delete().eq('id', s.id); load(); }} className="p-2 bg-red-500/20 text-red-400 rounded-lg">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
