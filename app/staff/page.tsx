'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function GestionStaff() {
  const [staff, setStaff] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const cargarStaff = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('Staff')
      .select('*')
      .eq('negocio_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setStaff(data)
    setLoading(false)
  }

  useEffect(() => { cargarStaff() }, [])

  const agregarBarbero = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('Staff').insert([
      { nombre, negocio_id: user?.id, activo: true }
    ])
    if (error) alert(error.message)
    else { setNombre(''); cargarStaff() }
  }

  const borrarStaff = async (id: string) => {
    if (confirm("¿Quitar a este barbero del equipo?")) {
      const { error } = await supabase.from('Staff').delete().eq('id', id)
      if (error) alert(error.message)
      else cargarStaff()
    }
  }

  const toggleActivo = async (id: string, estadoActual: boolean) => {
    const { error } = await supabase.from('Staff')
      .update({ activo: !estadoActual })
      .eq('id', id)
    if (error) alert(error.message)
    else cargarStaff()
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-xs font-black uppercase mb-4 hover:text-white transition-colors tracking-widest">
          ← VOLVER AL PANEL
        </button>
        
        <h1 className="text-5xl font-black uppercase italic mb-8 text-emerald-500 tracking-tighter">Mi Equipo</h1>

        {/* Formulario de Staff */}
        <form onSubmit={agregarBarbero} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 mb-12 flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Nombre del Barbero / Estilista</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              placeholder="Ej: Franco el barbero"
              className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 text-sm" 
              required 
            />
          </div>
          <button type="submit" className="bg-emerald-500 text-black font-black uppercase italic px-8 py-4 rounded-2xl hover:scale-105 transition-transform">
            CONTRATAR +
          </button>
        </form>

        {/* Lista de Staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((persona) => (
            <div key={persona.id} className="bg-slate-900/20 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-slate-900/40 transition-all">
              <div>
                <h3 className={`font-black uppercase italic text-xl tracking-tight ${!persona.activo && 'text-slate-600 line-through'}`}>
                  {persona.nombre}
                </h3>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${persona.activo ? 'text-emerald-500' : 'text-red-500'}`}>
                  {persona.activo ? '● DISPONIBLE' : '○ NO DISPONIBLE'}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleActivo(persona.id, persona.activo)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase"
                >
                  {persona.activo ? 'Pausar' : 'Activar'}
                </button>
                <button 
                  onClick={() => borrarStaff(persona.id)}
                  className="p-2 hover:text-red-500 text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}