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
      hora_fin: negocio.hora_fin
    }).eq('id', negocio.id)

    if (!error) {
      setMensaje('¡Cambios guardados con éxito!')
      setTimeout(() => setMensaje(''), 3000)
    } else {
      setMensaje('Error al guardar')
    }
  }

  if (loading) return <div className="p-8 text-slate-500 font-black animate-pulse uppercase">Cargando Configuración...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Ajustes del Local</h1>

      <form onSubmit={save} className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl">
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Nombre del Negocio</label>
            <input value={negocio.nombre} onChange={e => setNegocio({...negocio, nombre: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white outline-none focus:border-emerald-500" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Color de Marca (HEX)</label>
            <div className="flex gap-3">
              <input type="color" value={negocio.color_primario} onChange={e => setNegocio({...negocio, color_primario: e.target.value})} className="w-14 h-14 bg-transparent border-none cursor-pointer" />
              <input value={negocio.color_primario} onChange={e => setNegocio({...negocio, color_primario: e.target.value})} className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Abre a las:</label>
              <input type="time" value={negocio.hora_inicio} onChange={e => setNegocio({...negocio, hora_inicio: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Cierra a las:</label>
              <input type="time" value={negocio.hora_fin} onChange={e => setNegocio({...negocio, hora_fin: e.target.value})} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white" />
            </div>
          </div>
        </div>

        <button className="w-full py-5 rounded-2xl font-black bg-emerald-500 text-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
          Guardar Cambios
        </button>

        {mensaje && <p className="text-center text-xs font-black uppercase text-emerald-500 animate-bounce">{mensaje}</p>}
      </form>
    </div>
  )
}
