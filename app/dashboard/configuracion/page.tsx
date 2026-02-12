'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConfigPage() {
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    if (perfil?.negocio_id) {
      const { data } = await supabase.from('Negocio').select('*').eq('id', perfil.negocio_id).single()
      setNegocio(data)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (e: any) => {
    e.preventDefault()
    setMensaje('Guardando...')
    const { error } = await supabase.from('Negocio').update({
      nombre: negocio.nombre,
      color_primario: negocio.color_primario,
      hora_inicio: negocio.hora_inicio,
      hora_fin: negocio.hora_fin,
      logo_url: negocio.logo_url // Aseguramos que el logo se guarde
    }).eq('id', negocio.id)

    if (!error) {
      setMensaje('¡Configuración actualizada!')
      setTimeout(() => setMensaje(''), 3000)
      load() // Recargamos para refrescar la barra lateral si es necesario
    } else {
      setMensaje('Error al guardar')
    }
  }

  if (loading) return <div className="p-8 text-slate-500 font-black animate-pulse uppercase">Cargando...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Ajustes del Local</h1>

      <form onSubmit={save} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl">
        
        {/* VISTA PREVIA DEL LOGO */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-24 h-24 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden">
            {negocio.logo_url ? (
              <img src={negocio.logo_url} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] text-slate-600 font-black uppercase">Sin Logo</span>
            )}
          </div>
          <div className="w-full space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest text-center block">URL del Logo (Imagen)</label>
            <input 
              value={negocio.logo_url || ''} 
              onChange={e => setNegocio({...negocio, logo_url: e.target.value})} 
              placeholder="https://tu-imagen.png"
              className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-mono text-xs outline-none focus:border-emerald-500" 
            />
          </div>
        </div>

        <div className="grid gap-4 pt-6 border-t border-slate-800">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Nombre del Negocio</label>
            <input value={negocio.nombre} onChange={e => setNegocio({...negocio, nombre: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500 font-bold" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Color de Marca</label>
            <div className="flex gap-3">
              <input type="color" value={negocio.color_primario} onChange={e => setNegocio({...negocio, color_primario: e.target.value})} className="w-14 h-14 bg-transparent border-none cursor-pointer rounded-xl overflow-hidden" />
              <input value={negocio.color_primario} onChange={e => setNegocio({...negocio, color_primario: e.target.value})} className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-mono uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest text-center">Abre</label>
              <input type="time" value={negocio.hora_inicio} onChange={e => setNegocio({...negocio, hora_inicio: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-bold text-center" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest text-center">Cierra</label>
              <input type="time" value={negocio.hora_fin} onChange={e => setNegocio({...negocio, hora_fin: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-bold text-center" />
            </div>
          </div>
        </div>

        <button className="w-full py-5 rounded-2xl font-black bg-emerald-500 text-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
          Guardar Configuración
        </button>

        {mensaje && <p className="text-center text-xs font-black uppercase text-emerald-500 animate-bounce">{mensaje}</p>}
      </form>
    </div>
  )
}
