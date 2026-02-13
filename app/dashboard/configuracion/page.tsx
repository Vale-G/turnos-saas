'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ConfigPage() {
  const [negocio, setNegocio] = useState<any>(null)
  const [mensaje, setMensaje] = useState('')
  const diasSemana = [
    { id: '1', name: 'Lun' }, { id: '2', name: 'Mar' }, { id: '3', name: 'Mie' },
    { id: '4', name: 'Jue' }, { id: '5', name: 'Vie' }, { id: '6', name: 'Sab' }, { id: '0', name: 'Dom' }
  ]

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('negocio_id')
      .eq('id', user.id)
      .single()
    
    if (perfil?.negocio_id) {
      const { data } = await supabase
        .from('Negocio')
        .select('*')
        .eq('id', perfil.negocio_id)
        .single()
      setNegocio(data)
    }
  }

  useEffect(() => { load() }, [])

  const toggleDia = (id: string) => {
    if (!negocio) return
    let dias = negocio.dias_atencion ? negocio.dias_atencion.split(',') : []
    if (dias.includes(id)) {
      dias = dias.filter((d: string) => d !== id)
    } else {
      dias.push(id)
    }
    setNegocio({ ...negocio, dias_atencion: dias.join(',') })
  }

  const save = async () => {
    if (!negocio) return
    setMensaje('Guardando...')
    const { error } = await supabase.from('Negocio').update(negocio).eq('id', negocio.id)
    if (!error) {
      setMensaje('¡Configuración Pro guardada!')
      setTimeout(() => setMensaje(''), 2000)
    } else {
      setMensaje('Error al guardar')
    }
  }

  if (!negocio) return <div className="p-10 text-white italic animate-pulse">Cargando ajustes pro...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Configuración Pro</h1>
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-8 shadow-2xl">
        
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Días de Atención</label>
          <div className="flex flex-wrap gap-2">
            {diasSemana.map(d => (
              <button 
                key={d.id} 
                onClick={() => toggleDia(d.id)} 
                type="button"
                className={`flex-1 py-4 rounded-2xl font-black transition-all text-xs uppercase ${
                  negocio.dias_atencion?.split(',').includes(d.id) 
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                  : 'bg-slate-950 text-slate-600 border border-slate-800'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Abre</label>
            <input type="time" value={negocio.hora_inicio || ''} onChange={e => setNegocio({...negocio, hora_inicio: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Cierra</label>
            <input type="time" value={negocio.hora_fin || ''} onChange={e => setNegocio({...negocio, hora_fin: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl text-white border border-slate-800 focus:border-emerald-500 outline-none transition-all" />
          </div>
        </div>

        <button onClick={save} className="w-full py-5 rounded-[1.5rem] font-black bg-emerald-500 text-black uppercase italic shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
          Guardar Cambios
        </button>
        {mensaje && <p className="text-center text-emerald-500 font-black text-xs uppercase tracking-tighter animate-bounce">{mensaje}</p>}
      </div>
    </div>
  )
}
