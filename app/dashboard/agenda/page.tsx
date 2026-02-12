'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AgendaPage() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    if (perfil?.negocio_id) {
      const { data } = await supabase.from('Turno').select('*, Servicio(nombre)').eq('negocio_id', perfil.negocio_id).order('hora', { ascending: true })
      setTurnos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deleteTurno = async (id: string) => {
    if(confirm("¿Turno finalizado o cancelado?")) {
      await supabase.from('Turno').delete().eq('id', id)
      load()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase italic text-white tracking-tighter">Agenda del Día</h1>
          <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mt-1">Próximas citas agendadas</p>
        </div>
      </div>

      <div className="relative border-l-2 border-slate-800 ml-4 pl-8 space-y-8">
        {turnos.length === 0 && <p className="text-slate-600 italic p-4">No hay turnos para mostrar todavía.</p>}
        {turnos.map(t => (
          <div key={t.id} className="relative group">
            <div className="absolute -left-[41px] top-2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#020617] group-hover:scale-125 transition-all shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            
            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800 hover:border-slate-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-6">
                <span className="text-2xl font-black text-white italic min-w-[70px]">{t.hora.slice(0,5)}</span>
                <div>
                  <p className="font-bold text-white text-lg leading-tight tracking-tight">{t.cliente_nombre}</p>
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">{t.Servicio?.nombre}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <a href={`https://wa.me/${t.cliente_whatsapp}`} target="_blank" className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-black transition-all">WhatsApp</a>
                <button onClick={() => deleteTurno(t.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
