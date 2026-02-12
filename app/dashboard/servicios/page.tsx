'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [color, setColor] = useState('#10b981')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
      if (perfil?.negocio_id) {
        const { data: n } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
        if (n?.color_primario) setColor(n.color_primario)
        const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
        setServicios(data || [])
      }
    }
    load()
  }, [])

  const add = async (e: any) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    const { error } = await supabase.from('Servicio').insert([{ 
      nombre, precio: parseFloat(precio), negocio_id: perfil?.negocio_id 
    }])
    if (!error) { setNombre(''); setPrecio(''); location.reload(); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase italic" style={{ color: color }}>Servicios</h1>
      <form onSubmit={add} className="flex gap-2 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <input placeholder="Corte..." value={nombre} onChange={e => setNombre(e.target.value)} className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800" required />
        <input placeholder="Precio" type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-32 bg-slate-950 p-3 rounded-xl border border-slate-800" required />
        <button className="px-6 rounded-xl font-bold text-black" style={{ backgroundColor: color }}>+</button>
      </form>
      <div className="grid gap-3">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="font-bold">{s.nombre}</span>
            <span className="font-black" style={{ color: color }}>${s.precio}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
