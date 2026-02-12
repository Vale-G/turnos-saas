'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AgendaPage() {
  const [turnos, setTurnos] = useState<any[]>([])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
    
    if (perfil?.negocio_id) {
      const { data } = await supabase.from('Turno')
        .select('*, Servicio(nombre)')
        .eq('negocio_id', perfil.negocio_id)
        .order('created_at', { ascending: false })
      setTurnos(data || [])
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase italic text-white tracking-tighter">Agenda</h1>
      <div className="grid gap-3">
        {turnos.length === 0 && <p className="text-slate-600 italic">No hay reservas todavía.</p>}
        {turnos.map(t => (
          <div key={t.id} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center shadow-xl">
            <div>
              <p className="text-white font-bold text-lg">{t.cliente_nombre}</p>
              <p className="text-emerald-500 font-black text-xs uppercase">{t.Servicio?.nombre} - {t.hora}hs</p>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] font-black uppercase">WhatsApp</span>
              <p className="text-white font-mono text-sm">{t.cliente_whatsapp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
