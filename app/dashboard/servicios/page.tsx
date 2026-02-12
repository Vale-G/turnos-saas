'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
}

export default function ServiciosPro() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [color, setColor] = useState('#10b981')
  const [form, setForm] = useState({ nombre: '', precio: '', duracion: '30' })

  const fetchServicios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user.id).single()
    
    if (perfil?.negocio_id) {
      const { data: neg } = await supabase.from('Negocio').select('color_primario').eq('id', perfil.negocio_id).single()
      if (neg?.color_primario) setColor(neg.color_primario)

      const { data } = await supabase.from('Servicio').select('*').eq('negocio_id', perfil.negocio_id).order('created_at')
      setServicios(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchServicios() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()

    const { error } = await supabase.from('Servicio').insert([
      { ...form, precio: parseFloat(form.precio), duracion: parseInt(form.duracion), negocio_id: perfil!.negocio_id }
    ])

    if (!error) {
      setForm({ nombre: '', precio: '', duracion: '30' })
      fetchServicios()
    }
  }

  const deleteServicio = async (id: string) => {
    if (confirm('¿Eliminar este servicio?')) {
      await supabase.from('Servicio').delete().eq('id', id)
      fetchServicios()
    }
  }

  if (loading) return <div className="p-10 animate-pulse text-slate-500 font-black uppercase">Cargando catálogo...</div>

  return (
    <div className="max-w-5xl space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Servicios</h1>
          <p className="text-slate-500 font-medium">Define tus especialidades y tarifas.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block ml-1">Nombre</label>
          <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-slate-600" placeholder="Ej: Corte Degradado" required />
        </div>
        <div>
          <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block ml-1">Precio</label>
          <input type="number" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-slate-600" placeholder="$" required />
        </div>
        <button className="h-[58px] rounded-2xl font-black uppercase italic tracking-tighter transition-all hover:brightness-110 active:scale-95" style={{ backgroundColor: color, color: '#000' }}>
          Guardar
        </button>
      </form>

      <div className="grid grid-cols-1 gap-3">
        {servicios.map(s => (
          <div key={s.id} className="group bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center hover:border-slate-700 transition-all">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs" style={{ backgroundColor: `${color}15`, color: color }}>
                {s.duracion}'
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">{s.nombre}</h3>
                <p className="text-slate-500 text-sm font-bold">${s.precio}</p>
              </div>
            </div>
            <button onClick={() => deleteServicio(s.id)} className="opacity-0 group-hover:opacity-100 p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all">
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
