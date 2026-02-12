'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Barbero {
  id: string;
  nombre: string;
  rol_interno: string;
  activo: boolean;
}

export default function PersonalPro() {
  const [staff, setStaff] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(true)
  const [color, setColor] = useState('#10b981')
  const [nombre, setNombre] = useState('')

  const fetchStaff = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()
    
    const { data: neg } = await supabase.from('Negocio').select('color_primario').eq('id', perfil!.negocio_id).single()
    if (neg?.color_primario) setColor(neg.color_primario)

    const { data } = await supabase.from('Personal').select('*').eq('negocio_id', perfil!.negocio_id)
    setStaff(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user!.id).single()

    await supabase.from('Personal').insert([{ nombre, negocio_id: perfil!.negocio_id }])
    setNombre(''); fetchStaff()
  }

  if (loading) return <div className="p-10 text-slate-500 font-black italic">Cargando equipo...</div>

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Equipo</h1>
        <p className="text-slate-500 font-medium">Gestiona tus barberos y colaboradores.</p>
      </div>

      <form onSubmit={handleAdd} className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-[10px] uppercase font-black text-slate-500 mb-2 block ml-1">Nombre completo del Barbero</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white outline-none focus:border-slate-600" placeholder="Ej: Nicolas Cieri" required />
        </div>
        <button className="h-[58px] px-10 rounded-2xl font-black uppercase italic transition-all active:scale-95" style={{ backgroundColor: color, color: '#000' }}>
          Dar de alta
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staff.map(b => (
          <div key={b.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">{b.nombre}</h3>
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: color }}>{b.rol_interno}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
