'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)
  const [color, setColor] = useState('#10b981')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
      
      const { data: negocio } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
      if (negocio?.color_primario) setColor(negocio.color_primario)

      const { data: servs } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
      setServicios(servs || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const agregarServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()

    const { data, error } = await supabase.from('Servicio').insert([
      { nombre, precio: parseFloat(precio), negocio_id: perfil.negocio_id }
    ]).select().single()

    if (!error) {
      setServicios([...servicios, data])
      setNombre(''); setPrecio('')
    }
  }

  if (loading) return <div className="p-8 text-white">Cargando servicios...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-white uppercase italic">✂️ Servicios</h1>

      {/* Formulario rápido */}
      <form onSubmit={agregarServicio} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 uppercase font-bold ml-1">Nombre del Servicio</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white mt-1" placeholder="Ej: Corte Degradado" required />
        </div>
        <div className="w-32">
          <label className="text-xs text-slate-500 uppercase font-bold ml-1">Precio ($)</label>
          <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white mt-1" placeholder="5000" required />
        </div>
        <button type="submit" className="px-8 py-3 rounded-xl font-bold transition-transform active:scale-95" style={{ backgroundColor: color, color: '#000' }}>
          + Agregar
        </button>
      </form>

      {/* Lista de Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center shadow-lg">
            <div>
              <p className="text-white font-bold text-lg">{s.nombre}</p>
              <p className="font-black text-xl" style={{ color: color }}>${s.precio}</p>
            </div>
            <div className="text-slate-600 text-xs uppercase font-bold">30 min</div>
          </div>
        ))}
      </div>
    </div>
  )
}
