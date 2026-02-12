'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('30')

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    if (perfil?.negocio_id) {
      const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
      setServicios(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const add = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    // IMPORTANTE: Aquí usamos "duracion_minutos" que es lo que pide tu error
    const { error } = await supabase.from('Servicio').insert([{ 
      nombre, 
      precio: parseFloat(precio), 
      duracion_minutos: parseInt(duracion),
      negocio_id: perfil?.negocio_id
    }])
    
    if (error) alert("Error al guardar: " + error.message)
    else { setNombre(''); setPrecio(''); setDuracion('30'); load(); }
  }

  if (loading) return <div className="p-8 text-slate-500 font-black animate-pulse uppercase">Cargando...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase italic text-white">Servicios</h1>
      <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl">
        <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <input placeholder="Precio" type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <input placeholder="Minutos" type="number" value={duracion} onChange={e => setDuracion(e.target.value)} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-white outline-none focus:border-emerald-500" required />
        <button className="rounded-xl font-black bg-emerald-500 text-black uppercase hover:scale-105 transition-transform">Guardar</button>
      </form>
      
      <div className="grid gap-3">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center hover:border-slate-600 transition-all shadow-lg">
            <div>
              <p className="font-bold text-white text-lg">{s.nombre}</p>
              <p className="text-xs text-slate-500 uppercase font-black">{s.duracion_minutos || s.duracion} min</p>
            </div>
            <span className="font-black text-emerald-500 text-2xl">${s.precio}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
