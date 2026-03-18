'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type TurnoItem = {
  id: string
  hora: string
  cliente_nombre: string
  estado: string
  fecha: string
  Servicio?: { nombre: string; precio: number }
  Staff?: { nombre: string }
}

export default function AgendaTurnos() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const router = useRouter()

  const totalIngresos = useMemo(() => {
    return turnos
      .filter((t) => t.estado !== 'cancelado')
      .reduce((acc, t) => acc + (t.Servicio?.precio ?? 0), 0)
  }, [turnos])

  const estadoColorClass = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return 'bg-emerald-500'
      case 'pendiente':
        return 'bg-amber-500'
      case 'cancelado':
        return 'bg-rose-500'
      default:
        return 'bg-slate-500'
    }
  }

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: negocio } = await supabase.from('Negocio').select('tema').eq('id', user.id).single()
      if (mounted) setColorPrincipal(getThemeColor(negocio?.tema))

      const { data } = await supabase
        .from('Turno')
        .select(`
          *,
          Servicio (nombre, precio, duracion),
          Staff (nombre)
        `)
        .eq('negocio_id', user.id)
        .eq('fecha', fechaFiltro)
        .order('hora', { ascending: true })

      if (mounted) setTurnos(data || [])
      if (mounted) setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [fechaFiltro, reloadKey, router])

  const eliminarTurno = async (id: string) => {
    if (!confirm("¿Seguro que querés borrar este turno?")) return
    const { error } = await supabase.from('Turno').delete().eq('id', id)
    if (!error) setReloadKey((prev) => prev + 1)
  }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    await supabase.from('Turno').update({ estado: nuevoEstado }).eq('id', id)
    setReloadKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase mb-2 block">← Volver</button>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
              Agenda
            </h1>
            <div className="mt-6 rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-6 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cierre de caja</p>
                <span className="text-xs font-black uppercase text-slate-500">(excluye cancelados)</span>
              </div>
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-4xl font-black" style={{ color: colorPrincipal }}>${totalIngresos.toFixed(2)}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total por servicios</p>
                </div>
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ backgroundColor: `${colorPrincipal}20`, border: `1px solid ${colorPrincipal}` }}
                >
                  <span className="text-xs font-black" style={{ color: colorPrincipal }}>
                    {turnos.filter((t) => t.estado !== 'cancelado').length}
                  </span>
                </div>
              </div>
            </div>
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
              <div
                key={t.id}
                className={`group bg-slate-900/40 border p-6 rounded-[2rem] flex justify-between items-center transition-all ${
                  t.estado === 'completado' ? 'opacity-40 grayscale' : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-stretch gap-4">
                  <div className={`w-1 rounded-l-2xl ${estadoColorClass(t.estado)}`} />
                  <div className="flex gap-6 items-center">
                    <div className="text-2xl font-black italic" style={{ color: colorPrincipal }}>
                      {t.hora.slice(0, 5)}
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-lg leading-none">{t.cliente_nombre}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                        {t.Servicio?.nombre} — <span className="text-white">{t.Staff?.nombre}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {t.estado !== 'completado' && (
                    <button
                      onClick={() => cambiarEstado(t.id, 'completado')}
                      className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => eliminarTurno(t.id)}
                    className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-black transition-all"
                  >
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