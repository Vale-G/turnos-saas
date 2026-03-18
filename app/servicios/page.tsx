'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function GestionServicios() {
  const [servicios, setServicios] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('')
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const router = useRouter()

  const cargarServicios = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('Servicio')
      .select('*')
      .eq('negocio_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setServicios(data)
    setLoading(false)
  }

  useEffect(() => { cargarServicios() }, [])

  const agregarServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('Servicio').insert([
      { nombre, precio: parseFloat(precio), duracion: parseInt(duracion), negocio_id: user?.id }
    ])
    if (error) alert(error.message)
    else { setNombre(''); setPrecio(''); setDuracion(''); cargarServicios() }
  }

  const borrarServicio = async (id: string) => {
    if (confirm("¿Seguro que quieres borrar este servicio?")) {
      const { error } = await supabase.from('Servicio').delete().eq('id', id)
      if (error) alert(error.message)
      else cargarServicios()
    }
  }

  const guardarEdicion = async (id: string, n: string, p: string, d: string) => {
    const { error } = await supabase.from('Servicio')
      .update({ nombre: n, precio: parseFloat(p), duracion: parseInt(d) })
      .eq('id', id)
    if (error) alert(error.message)
    else { setEditandoId(null); cargarServicios() }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-xs font-black uppercase mb-4 hover:text-white transition-colors tracking-widest">
          ← VOLVER AL PANEL
        </button>
        
        <h1 className="text-5xl font-black uppercase italic mb-8 text-emerald-500 tracking-tighter">Servicios</h1>

        {/* Formulario de Alta */}
        <form onSubmit={agregarServicio} className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 mb-12 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none focus:border-emerald-500 text-sm" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Precio $</label>
            <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none focus:border-emerald-500 text-sm" required />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Minutos</label>
            <input type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none focus:border-emerald-500 text-sm" required />
          </div>
          <button type="submit" className="bg-emerald-500 text-black font-black uppercase italic p-3 rounded-xl hover:scale-105 transition-transform">AGREGAR +</button>
        </form>

        {/* Lista de Servicios */}
        <div className="space-y-3">
          {servicios.map((s) => (
            <div key={s.id} className="bg-slate-900/20 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-slate-900/40 transition-all">
              {editandoId === s.id ? (
                // MODO EDICIÓN
                <div className="flex flex-1 gap-2 items-center">
                  <input id={`n-${s.id}`} defaultValue={s.nombre} className="bg-black border border-emerald-500/50 p-2 rounded-lg text-sm w-1/3" />
                  <input id={`p-${s.id}`} defaultValue={s.precio} className="bg-black border border-emerald-500/50 p-2 rounded-lg text-sm w-20" />
                  <input id={`d-${s.id}`} defaultValue={s.duracion} className="bg-black border border-emerald-500/50 p-2 rounded-lg text-sm w-20" />
                  <button onClick={() => {
                    const n = (document.getElementById(`n-${s.id}`) as HTMLInputElement).value;
                    const p = (document.getElementById(`p-${s.id}`) as HTMLInputElement).value;
                    const d = (document.getElementById(`d-${s.id}`) as HTMLInputElement).value;
                    guardarEdicion(s.id, n, p, d);
                  }} className="text-emerald-500 font-black text-xs uppercase ml-2">Listo</button>
                </div>
              ) : (
                // MODO VISTA
                <>
                  <div>
                    <h3 className="font-black uppercase italic text-lg tracking-tight">{s.nombre}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{s.duracion} MINUTOS</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-black text-emerald-500 italic">${s.precio}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditandoId(s.id)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white text-xs font-bold uppercase">Editar</button>
                      <button onClick={() => borrarServicio(s.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-500 text-xs font-bold uppercase">Borrar</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}