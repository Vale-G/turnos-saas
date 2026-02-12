'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AgendaPage() {
  const [turnos, setTurnos] = useState<any[]>([])

  useEffect(() => {
    async function loadTurnos() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = await supabase.from('perfiles').select('negocio_id').eq('id', user?.id).single()
      if (perfil?.negocio_id) {
        const { data } = await supabase.from('Turno').select('*, Servicio(nombre), Personal(nombre)').eq('negocio_id', perfil.negocio_id)
        setTurnos(data || [])
      }
    }
    loadTurnos()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black uppercase italic text-white">Agenda de Hoy</h1>
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        {turnos.length === 0 ? (
          <div className="p-10 text-center text-slate-500 italic">No hay turnos agendados para hoy.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {turnos.map(t => (
              <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-800/50">
                <div>
                  <p className="text-white font-bold">{t.cliente_nombre}</p>
                  <p className="text-xs text-slate-500 uppercase font-black">{t.hora} - {t.Servicio?.nombre}</p>
                </div>
                <div className="text-emerald-500 font-bold text-sm">Con {t.Personal?.nombre}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
