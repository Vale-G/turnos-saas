'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ id: '', nombre: '', precio: '', duracion: '30' })
  const [editando, setEditando] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    if (perfil?.negocio_id) {
      const { data, error } = await supabase.from('Servicio')
        .select('*')
        .eq('negocio_id', perfil.negocio_id)
        .order('created_at', { ascending: false })
      
      if (data) {
        // Normalizamos los datos para que el código siempre vea "duracion"
        const normalizados = data.map(s => ({
          ...s,
          duracion: s.duracion || s.duracion_minutos || 30
        }))
        setServicios(normalizados)
      }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    // Mandamos ambos nombres por las dudas para que la DB elija el que existe
    const payload: any = { 
      nombre: form.nombre, 
      precio: parseFloat(form.precio),
      negocio_id: perfil?.negocio_id
    }
    
    // Intentamos llenar ambos posibles nombres de columna
    payload.duracion = parseInt(form.duracion)
    payload.duracion_minutos = parseInt(form.duracion)

    if (editando) {
      await supabase.from('Servicio').update(payload).eq('id', form.id)
    } else {
      await supabase.from('Servicio').insert([payload])
    }
    
    setForm({ id: '', nombre: '', precio: '', duracion: '30' })
    setEditando(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar servicio?')) {
      await supabase.from('Servicio').delete().eq('id', id)
      load()
    }
  }

  if (loading) return <div className="p-10 text-slate-500 font-black animate-pulse uppercase">Sincronizando...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">
        {editando ? '📝 Editando' : '✂️ Servicios'}
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <input placeholder="Precio" type="number" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <input placeholder="Minutos" type="number" value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <button className={`h-[58px] rounded-2xl font-black uppercase italic transition-all ${editando ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-black'}`}>
          {editando ? 'Actualizar' : 'Guardar'}
        </button>
      </form>
      
      <div className="grid gap-4">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center group shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-xs">
                {s.duracion}'
              </div>
              <div>
                <p className="font-bold text-white text-lg">{s.nombre}</p>
                <p className="font-black text-emerald-500 tracking-tighter text-xl">${s.precio}</p>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => { setForm({id: s.id, nombre: s.nombre, precio: s.precio.toString(), duracion: s.duracion.toString()}); setEditando(true); }} className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all">✏️</button>
              <button onClick={() => handleDelete(s.id)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
