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
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    const { data } = await supabase.from('Negocio').select('*').eq('id', perfil.negocio_id).single()
    setNegocio(data)
  }

  useEffect(() => { load() }, [])

  const toggleDia = (id: string) => {
    let dias = negocio.dias_atencion.split(',')
    if (dias.includes(id)) dias = dias.filter((d: string) => d !== id)
    else dias.push(id)
    setNegocio({ ...negocio, dias_atencion: dias.join(',') })
  }

  const save = async () => {
    setMensaje('Guardando...')
    await supabase.from('Negocio').update(negocio).eq('id', negocio.id)
    setMensaje('¡Configuración Pro guardada!')
    setTimeout(() => setMensaje(''), 2000)
  }

  if (!negocio) return <div className="p-10 text-white italic">Cargando ajustes pro...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <h1 className="text-3xl font-black uppercase italic text-white">Configuración Pro</h1>
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-8 shadow-2xl">
        
        {/* SELECTOR DE DÍAS */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Días de Atención</label>
          <div className="flex flex-wrap gap-2">
            {diasSemana.map(d => (
              <button key={d.id} onClick={() => toggleDia(d.id)} type="button"
                className={`flex-1 py-3 rounded-xl font-bold transition-all ${negocio.dias_atencion.split(',').includes(d.id) ? 'bg-emerald-500 text-black' : 'bg-slate-950 text-slate-600'}`}>
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Hora Inicio</label>
            <input type="time" value={negocio.hora_inicio} onChange={e => setNegocio({...negocio, hora_inicio: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl text-white border border-slate-800" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">Hora Fin</label>
            <input type="time" value={negocio.hora_fin} onChange={e => setNegocio({...negocio, hora_fin: e.target.value})} className="w-full bg-slate-950 p-4 rounded-xl text-white border border-slate-800" />
          </div>
        </div>

        <button onClick={save} className="w-full py-5 rounded-2xl font-black bg-emerald-500 text-black uppercase italic shadow-xl">Guardar Cambios</button>
        {mensaje && <p className="text-center text-emerald-500 font-black animate-pulse">{mensaje}</p>}
      </div>
    </div>
  )
}
