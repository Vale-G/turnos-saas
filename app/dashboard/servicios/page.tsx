'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    if (perfil?.negocio_id) {
      const { data, error } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
      if (error) console.error("Error cargando:", error)
      setServicios(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const add = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    const { error } = await supabase.from('Servicio').insert([{ 
      nombre, precio: parseFloat(precio), negocio_id: perfil?.negocio_id, duracion: 30
    }])
    
    if (error) alert("Error al guardar: " + error.message)
    else { setNombre(''); setPrecio(''); load(); }
  }

  if (loading) return <div className="p-8 text-slate-500 font-black animate-pulse uppercase">Cargando catálogo...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase italic text-white">Servicios</h1>
      <form onSubmit={add} className="flex gap-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
        <input placeholder="Corte..." value={nombre} onChange={e => setNombre(e.target.value)} className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 outline-none focus:border-slate-500" required />
        <input placeholder="Precio" type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-32 bg-slate-950 p-3 rounded-xl border border-slate-800 outline-none focus:border-slate-500" required />
        <button className="px-8 rounded-xl font-black bg-emerald-500 text-black hover:scale-105 transition-transform uppercase">Guardar</button>
      </form>
      <div className="grid gap-3">
        {servicios.length === 0 && <p className="text-slate-600 italic">No hay servicios cargados aún.</p>}
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center hover:border-slate-600 transition-all">
            <span className="font-bold text-white text-lg">{s.nombre}</span>
            <span className="font-black text-emerald-500 text-xl">${s.precio}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
