'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  negocio_id: string;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [color, setColor] = useState('#10b981')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Chequeo de seguridad para TypeScript
      if (!user) return;

      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
      
      if (perfil?.negocio_id) {
        const { data: negocio } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
        if (negocio?.color_primario) setColor(negocio.color_primario)

        const { data: servs } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id)
        setServicios(servs || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const agregarServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return;

    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()

    if (perfil?.negocio_id) {
      const { data, error } = await supabase.from('Servicio').insert([
        { nombre, precio: parseFloat(precio), negocio_id: perfil.negocio_id }
      ]).select().single()

      if (!error && data) {
        setServicios([...servicios, data])
        setNombre(''); setPrecio('')
      }
    }
  }

  if (loading) return <div className="p-8 text-white">Cargando servicios...</div>

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">✂️ Servicios</h1>

      <form onSubmit={agregarServicio} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex gap-4 flex-wrap items-end shadow-2xl">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 uppercase font-bold ml-1">Nombre del Servicio</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white mt-1 outline-none focus:border-slate-600 transition-all" placeholder="Ej: Corte + Barba" required />
        </div>
        <div className="w-40">
          <label className="text-xs text-slate-500 uppercase font-bold ml-1">Precio ($)</label>
          <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white mt-1 outline-none focus:border-slate-600 transition-all" placeholder="5500" required />
        </div>
        <button type="submit" className="px-10 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-transform active:scale-95 shadow-lg" style={{ backgroundColor: color, color: '#000' }}>
          + Agregar
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicios.map(s => (
          <div key={s.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center shadow-xl hover:border-slate-700 transition-all">
            <div>
              <p className="text-white font-bold text-xl tracking-tight">{s.nombre}</p>
              <p className="font-black text-2xl mt-1" style={{ color: color }}>${s.precio}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl text-slate-500 text-[10px] uppercase font-black tracking-widest border border-slate-800">
              30 MIN
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
