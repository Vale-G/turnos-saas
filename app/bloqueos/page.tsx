'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function BloqueosElite() {
  const [bloqueos, setBloqueos] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  // Form
  const [staffId, setStaffId] = useState('')
  const [recurrente, setRecurrente] = useState(false)
  const [diaSemana, setDiaSemana] = useState('1')
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('13:00')
  const [horaFin, setHoraFin] = useState('14:00')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: neg } = await supabase.from('negocio').select('id, tema').eq('owner_id', user.id).single()
      if (!neg) return router.push('/onboarding')
      setNegocio(neg)

      const [{ data: stf }, { data: blq }] = await Promise.all([
        supabase.from('staff').select('*').eq('negocio_id', neg.id),
        supabase.from('bloquehorario').select('*, staff(nombre)').eq('negocio_id', neg.id).order('created_at', { ascending: false })
      ])
      
      setStaff(stf || [])
      if (stf && stf.length > 0) setStaffId(stf[0].id)
      setBloqueos(blq || [])
      setLoading(false)
    }
    init()
  }, [router])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const newBloqueo = {
      negocio_id: negocio.id,
      staff_id: staffId || null,
      recurrente,
      dia_semana: recurrente ? parseInt(diaSemana) : null,
      fecha: !recurrente ? fecha : null,
      hora_inicio: horaInicio + ':00',
      hora_fin: horaFin + ':00'
    }

    const { data, error } = await supabase.from('bloquehorario').insert(newBloqueo).select('*, staff(nombre)').single()
    if (error) toast.error('Error al bloquear horario')
    else {
      setBloqueos([data, ...bloqueos])
      toast.success('Horario bloqueado')
    }
    setGuardando(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Desbloquear este horario?')) return
    await supabase.from('bloquehorario').delete().eq('id', id)
    setBloqueos(bloqueos.filter(b => b.id !== id))
    toast.success('Horario desbloqueado')
  }

  const colorP = getThemeColor(negocio?.tema)
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse tracking-tighter">CARGANDO...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Bloqueos <span style={{ color: colorP }}>PRO</span></h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Formulario de Bloqueo */}
          <form onSubmit={agregar} className="bg-white/4 border border-white/5 p-8 md:p-10 rounded-[3.5rem] backdrop-blur-sm h-fit space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Nuevo Bloqueo (Ej: Almuerzo)</p>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Profesional</label>
              <select value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all text-white">
                <option value="">TODOS (Local Cerrado)</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>

            <div className="flex bg-black/50 border border-white/10 p-1.5 rounded-2xl">
              <button type="button" onClick={() => setRecurrente(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${recurrente ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Recurrente</button>
              <button type="button" onClick={() => setRecurrente(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!recurrente ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Fecha Específica</button>
            </div>

            {recurrente ? (
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Día de la semana</label>
                <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all text-white">
                  {diasSemana.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Fecha exacta</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required={!recurrente} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Desde</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Hasta</label>
                <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} required className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
            </div>

            <button type="submit" disabled={guardando} className="w-full mt-4 py-5 rounded-[2rem] font-black uppercase italic text-lg text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl" style={{ backgroundColor: colorP }}>
              {guardando ? 'BLOQUEANDO...' : 'BLOQUEAR HORARIO'}
            </button>
          </form>

          {/* Lista de Bloqueos */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-4">Bloqueos Activos</p>
            {bloqueos.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-[3rem]">
                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Sin bloqueos registrados</p>
              </div>
            ) : bloqueos.map(b => (
              <div key={b.id} className="bg-white/4 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center group hover:bg-white/10 transition-all">
                 <div>
                   <p className="text-lg font-black uppercase italic" style={{color: colorP}}>{b.staff?.nombre || 'LOCAL CERRADO'}</p>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                     {b.recurrente ? `Todos los ${diasSemana[b.dia_semana]}` : b.fecha}
                   </p>
                   <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mt-0.5">
                     {b.hora_inicio.slice(0,5)} a {b.hora_fin.slice(0,5)} HS
                   </p>
                 </div>
                 <button onClick={() => eliminar(b.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 font-black text-[9px] uppercase tracking-widest transition-all bg-rose-500/10 px-3 py-2 rounded-xl hover:bg-rose-500/20">
                   Quitar
                 </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
