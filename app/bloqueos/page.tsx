'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function BloqueosPage() {
  const [negocio, setNegocio] = useState<any>(null)
  const [staff, setStaff] = useState<any[]>([])
  const [bloqueos, setBloqueos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [selStaff, setSelStaff] = useState('')
  const [fecha, setFecha] = useState('')
  const [hInicio, setHInicio] = useState('09:00')
  const [hFin, setHFin] = useState('10:00')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
      }
      if (nId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', nId).single()
        setNegocio(neg)
        const [{ data: stf }, { data: blq }] = await Promise.all([
          supabase.from('staff').select('*').eq('negocio_id', nId).eq('activo', true),
          supabase.from('bloqueo').select('*, staff(nombre)').eq('negocio_id', nId).gte('fecha', new Date().toISOString().split('T')[0]).order('fecha', { ascending: true })
        ])
        setStaff(stf || [])
        setBloqueos(blq || [])
      }
      setLoading(false)
    }
    init()
  }, [router])

  const crearBloqueo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selStaff || !fecha) return toast.error('Completá los campos')
    const { error } = await supabase.from('bloqueo').insert({
      negocio_id: negocio.id, staff_id: selStaff, fecha, hora_inicio: hInicio + ':00', hora_fin: hFin + ':00'
    })
    if (error) toast.error('Error al bloquear')
    else {
      toast.success('Horario bloqueado')
      window.location.reload()
    }
  }

  const eliminarBloqueo = async (id: string) => {
    await supabase.from('bloqueo').delete().eq('id', id)
    setBloqueos(bloqueos.filter(b => b.id !== id))
    toast.success('Bloqueo eliminado')
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white">CARGANDO...</div>
  const colorP = getThemeColor(negocio?.tema)

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase mb-4 hover:text-white transition-colors">← Dashboard</button>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Bloqueos de <span style={{ color: colorP }}>Agenda</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <form onSubmit={crearBloqueo} className="bg-white/5 border border-white/10 p-10 rounded-[3rem] h-fit">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-8 tracking-widest">Nuevo Bloqueo Manual</p>
            <div className="space-y-4">
              <select value={selStaff} onChange={e => setSelStaff(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none">
                <option value="">ELEGIR PROFESIONAL</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none [&::-webkit-calendar-picker-indicator]:invert" />
              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={hInicio} onChange={e => setHInicio(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                <input type="time" value={hFin} onChange={e => setHFin(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <button type="submit" className="w-full py-5 rounded-2xl font-black uppercase italic text-black" style={{ backgroundColor: colorP }}>Bloquear Horario</button>
            </div>
          </form>

          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest px-4">Bloqueos Activos</p>
            <div className="space-y-3">
              {bloqueos.length === 0 ? <p className="text-slate-600 text-xs font-black uppercase p-6">No hay bloqueos futuros</p> : bloqueos.map(b => (
                <div key={b.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-black uppercase italic">{b.staff?.nombre}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{b.fecha} · {b.hora_inicio.slice(0,5)} a {b.hora_fin.slice(0,5)}</p>
                  </div>
                  <button onClick={() => eliminarBloqueo(b.id)} className="text-rose-500 font-black text-[10px] uppercase bg-rose-500/10 px-4 py-2 rounded-xl">Quitar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
