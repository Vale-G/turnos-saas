'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type Bloqueo = {
  id: string; fecha?: string; hora_inicio: string; hora_fin: string
  motivo?: string; recurrente: boolean; dia_semana?: number
}

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

export default function Bloqueos() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorP, setColorP] = useState(getThemeColor())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recurrente, setRecurrente] = useState(false)
  const [fecha, setFecha] = useState('')
  const [diaSemana, setDiaSemana] = useState('1')
  const [horaInicio, setHoraInicio] = useState('10:00')
  const [horaFin, setHoraFin] = useState('11:00')
  const [motivo, setMotivo] = useState('')
  const router = useRouter()

  const cargar = useCallback(async (nId: string) => {
    const { data } = await supabase.from('BloqueHorario')
      .select('*').eq('negocio_id', nId).order('created_at', { ascending: false })
    setBloqueos(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      let neg = null
      const { data: byOwner } = await supabase.from('Negocio').select('id, tema').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else { const { data: byId } = await supabase.from('Negocio').select('id, tema').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single(); neg = byId }
      if (!neg) { router.push('/onboarding'); return }
      setNegocioId(neg.id)
      setColorP(getThemeColor(neg.tema))
      await cargar(neg.id)
      setLoading(false)
    }
    init()
  }, [router, cargar])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocioId) return
    setError(null)
    if (horaInicio >= horaFin) { setError('La hora de fin debe ser mayor que la de inicio'); return }
    const { error } = await supabase.from('BloqueHorario').insert({
      negocio_id: negocioId,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      motivo: motivo || null,
      recurrente,
      fecha: recurrente ? null : fecha || null,
      dia_semana: recurrente ? parseInt(diaSemana) : null,
    })
    if (error) { setError(error.message); return }
    setMotivo('')
    setFecha('')
    await cargar(negocioId)
  }

  const eliminar = async (id: string) => {
    if (!negocioId || !confirm('Eliminar bloqueo?')) return
    await supabase.from('BloqueHorario').delete().eq('id', id)
    await cargar(negocioId)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic animate-pulse" style={{ color: colorP }}>
      Cargando...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/dashboard')}
          className="text-slate-500 text-[10px] font-black uppercase mb-4 block hover:text-white transition-colors tracking-widest">
          Volver
        </button>
        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2" style={{ color: colorP }}>
          Bloquear Horarios
        </h1>
        <p className="text-slate-500 text-sm mb-8">Bloqueá un horario puntual o recurrente. Los clientes no podrán reservar en ese rango.</p>

        {/* Formulario */}
        <form onSubmit={agregar} className="bg-white/4 border border-white/8 rounded-[2rem] p-6 space-y-4 mb-8">

          {/* Toggle recurrente */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setRecurrente(false)}
              className={'px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all ' +
                (!recurrente ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10')}
              style={!recurrente ? { backgroundColor: colorP } : {}}>
              Fecha específica
            </button>
            <button type="button" onClick={() => setRecurrente(true)}
              className={'px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all ' +
                (recurrente ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10')}
              style={recurrente ? { backgroundColor: colorP } : {}}>
              Recurrente (semanal)
            </button>
          </div>

          {recurrente ? (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Día de la semana</label>
              <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none">
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" required={!recurrente} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Desde</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Hasta</label>
              <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Motivo (opcional)</label>
            <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Almuerzo, Turno médico..."
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

          <button type="submit"
            className="w-full py-4 rounded-2xl font-black italic text-lg text-black transition-all hover:opacity-90"
            style={{ backgroundColor: colorP }}>
            Bloquear horario
          </button>
        </form>

        {/* Lista */}
        <div className="space-y-3">
          {bloqueos.length === 0 ? (
            <div className="text-center py-12 bg-white/3 rounded-[2rem] border border-dashed border-white/10">
              <p className="text-slate-600 font-black uppercase italic">Sin bloqueos activos</p>
            </div>
          ) : bloqueos.map(b => (
            <div key={b.id} className="bg-white/4 border border-white/8 rounded-2xl px-5 py-4 flex items-center justify-between group hover:bg-white/6 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black uppercase italic">{b.hora_inicio.slice(0,5)} — {b.hora_fin.slice(0,5)}</span>
                  {b.recurrente ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                      Cada {DIAS[b.dia_semana ?? 0]}
                    </span>
                  ) : (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                      {b.fecha ? new Date(b.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''}
                    </span>
                  )}
                </div>
                {b.motivo && <p className="text-slate-500 text-xs">{b.motivo}</p>}
              </div>
              <button onClick={() => eliminar(b.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-xs font-black uppercase transition-all px-3 py-1.5 rounded-lg hover:bg-red-500/10">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
