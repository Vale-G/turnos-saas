'use client'

import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'

function getDayOfWeek(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

function getWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    return d
  })
}

export default function AgendaElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [turnos, setTurnos] = useState<any[]>([])
  const [bloqueos, setBloqueos] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const router = useRouter()

  const [modalBloqueo, setModalBloqueo] = useState(false)
  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false)
  const [formBloqueo, setFormBloqueo] = useState({
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '10:00',
    motivo: '',
  })

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])
  const colorP = negocio ? getThemeColor(negocio.tema) : '#10b981'
  const horas = Array.from({ length: 18 }, (_, i) => `${i + 6}:00`)

  const cargarDatos = useCallback(async (negocioId: string) => {
    const start = weekDays[0]
    const end = new Date(weekDays[6])
    end.setDate(end.getDate() + 1)

    const startUTC = start.toISOString()
    const endUTC = end.toISOString()

    const [turnosRes, bloqueosRes, staffRes] = await Promise.all([
      supabase
        .from('turno')
        .select('*, servicio(nombre, duracion), staff(nombre)')
        .eq('negocio_id', negocioId)
        .gte('start_time', startUTC)
        .lt('start_time', endUTC)
        .not('estado', 'in', '("cancelado")'),
      supabase
        .from('horarios_bloqueados')
        .select('*')
        .eq('negocio_id', negocioId)
        .gte('start_time', startUTC)
        .lt('end_time', endUTC),
      supabase
        .from('staff')
        .select('id, nombre')
        .eq('negocio_id', negocioId)
        .eq('activo', true),
    ])
    setTurnos(turnosRes.data || [])
    setBloqueos(bloqueosRes.data || [])
    setStaff(staffRes.data || [])
  }, [weekDays])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      let negocioId: string | null = null
      const { data: adm } = await supabase.from('adminrol').select('negocio_id').eq('user_id', user.id).maybeSingle()
      if (adm?.negocio_id) {
        negocioId = adm.negocio_id
      } else {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        if (n) negocioId = n.id
      }

      if (negocioId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', negocioId).single()
        setNegocio(neg)
        await cargarDatos(negocioId)
      }
      setLoading(false)
    }
    init()
  }, [router, cargarDatos])

  const handleUpdateStatus = async (turnoId: string, newState: string) => {
    if (!window.confirm(`¿Marcar turno como ${newState}?`)) return

    const { data, error } = await supabase
      .from('turno')
      .update({ estado: newState })
      .eq('id', turnoId)
      .select('*, servicio(nombre, duracion), staff(nombre)')
      .single()

    if (error) {
      toast.error('Error al actualizar el estado del turno')
      return
    }

    setTurnos((prev) => prev.map((t) => (t.id === turnoId ? data : t)))
    toast.success('Turno actualizado')
  }
  
  const crearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoBloqueo(true)

    const start_time = `${formBloqueo.start_date}T${formBloqueo.start_time}:00`
    const end_time = `${formBloqueo.end_date}T${formBloqueo.end_time}:00`

    const { data, error } = await supabase.from('horarios_bloqueados').insert({
        negocio_id: negocio.id,
        start_time: start_time,
        end_time: end_time,
        motivo: formBloqueo.motivo
    }).select().single()

    setGuardandoBloqueo(false)
    if (error) {
        toast.error('Error al crear el bloqueo. Asegúrate de que las fechas y horas son válidas.')
        return
    }

    setBloqueos(prev => [...prev, data])
    setModalBloqueo(false)
    toast.success('Horario bloqueado con éxito')
  }
  
  const eliminarBloqueo = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este bloqueo?')) return
    const { error } = await supabase.from('horarios_bloqueados').delete().eq('id', id)
    if(error){
      toast.error('Error al eliminar el bloqueo.')
      return
    }
    setBloqueos(prev => prev.filter(b => b.id !== id))
    toast.success('Bloqueo eliminado.')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase tracking-widest text-2xl">CARGANDO AGENDA...</div>
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">
              ← Volver al Dashboard
            </button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
              Agenda <span style={{ color: colorP }}>{negocio?.nombre}</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setModalBloqueo(true)} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                BLOQUEAR HORARIO
            </button>
            <div className="flex bg-white/5 border border-white/10 p-2 rounded-2xl">
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">←</button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-300 hover:text-white">Hoy</button>
              <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white">→</button>
            </div>
          </div>
        </header>
        <div className="grid grid-cols-8 bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden">
          <div className="col-span-1 border-r border-white/5"></div>
          {staff.map((s, i) => (
            <div key={s.id} className={`text-center py-4 font-black uppercase italic text-sm ${i < staff.length - 1 ? 'border-r border-white/5' : ''}`}>
              {s.nombre}
            </div>
          ))}
          {horas.map((hora) => (
            <div key={hora} className="grid grid-cols-8 col-span-8 border-t border-white/5 h-24">
              <div className="col-span-1 text-center py-4 border-r border-white/5">
                <span className="text-xs font-black text-slate-600">{hora}</span>
              </div>
              {staff.map((s, i) => {
                const cellDate = new Date(currentDate)
                cellDate.setHours(parseInt(hora), 0, 0, 0)
                const turnosEnCelda = turnos.filter(t => {
                    const turnoDate = parseISO(t.start_time)
                    return t.staff_id === s.id && turnoDate.getHours() === parseInt(hora) && getDayOfWeek(turnoDate) === (cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1)
                })
                const bloqueosEnCelda = bloqueos.filter(b => {
                    const start = parseISO(b.start_time)
                    const end = parseISO(b.end_time)
                    return cellDate >= start && cellDate < end
                })

                return (
                  <div key={s.id} className={`p-1 ${i < staff.length - 1 ? 'border-r border-white/5' : ''}`}>
                    {turnosEnCelda.map(turno => (
                         <div key={turno.id} style={{ backgroundColor: colorP + '20', borderColor: colorP, color: colorP }} className="border-l-4 rounded-lg p-2 text-[10px] font-bold leading-tight h-full flex flex-col justify-between">
                            <div>
                                <p className="font-black text-white text-xs whitespace-nowrap overflow-hidden text-ellipsis">{turno.cliente_nombre?.split(' ')[0]}</p>
                                <p className="whitespace-nowrap overflow-hidden text-ellipsis">{turno.servicio.nombre}</p>
                            </div>
                            <div className="flex gap-1 mt-1">
                                <button onClick={() => handleUpdateStatus(turno.id, 'completado')} className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 text-xs">✓</button>
                                <button onClick={() => handleUpdateStatus(turno.id, 'ausente')} className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 text-xs">✕</button>
                            </div>
                        </div>
                    ))}
                     {bloqueosEnCelda.map(bloqueo => (
                        <div key={bloqueo.id} className="bg-red-500/10 border-l-4 border-red-500 rounded-lg p-2 text-[10px] h-full flex flex-col justify-between group relative">
                             <div>
                                <p className="font-bold text-red-400 uppercase">BLOQUEADO</p>
                                {bloqueo.motivo && <p className="text-red-400/70 whitespace-nowrap overflow-hidden text-ellipsis">{bloqueo.motivo}</p>}
                            </div>
                           <button onClick={() => eliminarBloqueo(bloqueo.id)} className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 text-xs">X</button>
                        </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
       {modalBloqueo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50 animate-in fade-in">
            <div className="bg-[#020617] border border-white/10 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-black uppercase italic text-red-500 mb-6">Crear Bloqueo de Horario</h2>
                <form onSubmit={crearBloqueo} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Desde Fecha</label>
                            <input type="date" value={formBloqueo.start_date} onChange={e => setFormBloqueo({...formBloqueo, start_date: e.target.value})} required className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500/50 transition-all"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Desde Hora</label>
                            <input type="time" value={formBloqueo.start_time} onChange={e => setFormBloqueo({...formBloqueo, start_time: e.target.value})} required className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500/50 transition-all"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Hasta Fecha</label>
                            <input type="date" value={formBloqueo.end_date} onChange={e => setFormBloqueo({...formBloqueo, end_date: e.target.value})} required className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500/50 transition-all"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Hasta Hora</label>
                            <input type="time" value={formBloqueo.end_time} onChange={e => setFormBloqueo({...formBloqueo, end_time: e.target.value})} required className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500/50 transition-all"/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Motivo (Opcional)</label>
                        <input type="text" value={formBloqueo.motivo} onChange={e => setFormBloqueo({...formBloqueo, motivo: e.target.value})} placeholder="Ej: Cita con el dentista" className="w-full bg-white/5 p-3 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500/50 transition-all"/>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={() => setModalBloqueo(false)} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-white/10 text-white hover:bg-white/20">Cancelar</button>
                        <button type="submit" disabled={guardandoBloqueo} className="px-6 py-3 rounded-xl text-[10px] font-black uppercase bg-red-500 text-black hover:bg-red-400 disabled:opacity-50">{guardandoBloqueo ? 'BLOQUEANDO...' : 'Bloquear'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
