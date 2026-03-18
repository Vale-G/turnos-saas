'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AgendaTurnos() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const cargarTurnos = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('Turno')
      .select(`
        id,
        hora,
        cliente_nombre,
        estado,
        fecha,
        Servicio (nombre, precio),
        Staff (nombre)
      `)
      .eq('negocio_id', user?.id)
      .eq('fecha', fechaFiltro)
      .order('hora', { ascending: true })

    if (data) setTurnos(data)
    setLoading(false)
  }

  useEffect(() => { cargarTurnos() }, [fechaFiltro])

  const eliminarTurno = async (id: string) => {
    if (!confirm("¿Seguro que querés borrar este turno?")) return
    const { error } = await supabase.from('Turno').delete().eq('id', id)
    if (!error) cargarTurnos()
  }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    await supabase.from('Turno').update({ estado: nuevoEstado }).eq('id', id)
    cargarTurnos()
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase mb-2 block">← Volver</button>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-emerald-500">Agenda</h1>
          </div>
          
          {/* Selector de Fecha Estilizado */}
          <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
            <button onClick={() => {
                const d = new Date(fechaFiltro); d.setDate(d.getDate() - 1);
                setFechaFiltro(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white/5 rounded-xl">◀</button>
            
            <input 
              type="date" 
              value={fechaFiltro} 
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-transparent font-black uppercase italic text-sm outline-none cursor-pointer"
            />

            <button onClick={() => {
                const d = new Date(fechaFiltro); d.setDate(d.getDate() + 1);
                setFechaFiltro(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white/5 rounded-xl">▶</button>
          </div>
        </header>

        {loading ? (
          <div className="animate-pulse text-center py-20 font-black uppercase italic text-slate-700">Buscando turnos...</div>
        ) : turnos.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/10">
            <p className="text-slate-500 font-black uppercase italic">No hay turnos para este día</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turnos.map((t) => (
              <div key={t.id} className={`group bg-slate-900/40 border p-6 rounded-[2rem] flex justify-between items-center transition-all ${t.estado === 'completado' ? 'opacity-40 grayscale' : 'border-white/5 hover:border-white/20'}`}>
                <div className="flex gap-6 items-center">
                  <div className="text-2xl font-black italic text-emerald-500">{t.hora.slice(0, 5)}</div>
                  <div>
                    <h3 className="font-black uppercase text-lg leading-none">{t.cliente_nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                      {t.Servicio?.nombre} — <span className="text-white">{t.Staff?.nombre}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {t.estado !== 'completado' && (
                    <button onClick={() => cambiarEstado(t.id, 'completado')} className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl hover:bg-emerald-500 hover:text-black transition-all">
                      ✓
                    </button>
                  )}
                  <button onClick={() => eliminarTurno(t.id)} className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-black transition-all">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}