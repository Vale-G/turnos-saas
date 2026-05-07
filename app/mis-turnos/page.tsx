'use client'

import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

export default function MisTurnosPage() {
  const [user, setUser] = useState<any>(null)
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchUserAndTurnos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('turno')
        .select('*, negocio(nombre, slug, tema), servicio(nombre, precio)')
        .eq('cliente_id', user.id)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) {
        toast.error('Error al cargar tus turnos.')
        setLoading(false)
        return
      }

      setTurnos(data || [])
      setLoading(false)
    }

    fetchUserAndTurnos()
  }, [router])

  const { turnosFuturos, turnosPasados } = useMemo(() => {
    const ahora = new Date()
    return {
      turnosFuturos: turnos.filter(t => new Date(`${t.fecha}T${t.hora}`) >= ahora && t.estado !== 'cancelado'),
      turnosPasados: turnos.filter(t => new Date(`${t.fecha}T${t.hora}`) < ahora || t.estado === 'cancelado'),
    }
  }, [turnos])

  const handleCancelarTurno = async (turnoId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar este turno?')) return

    const { data, error } = await supabase
        .from('turno')
        .update({ estado: 'cancelado' })
        .eq('id', turnoId)
        .select()
        .single()

    if (error) {
        toast.error('No se pudo cancelar el turno.')
        return
    }
    
    setTurnos(prevTurnos => prevTurnos.map(t => t.id === turnoId ? {...t, estado: 'cancelado'} : t))
    toast.success('Turno cancelado con éxito')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase tracking-widest text-2xl">
        CARGANDO MIS TURNOS...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-6 mb-12">
            <div>
                 <button onClick={() => router.push('/')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">
                    ← Volver
                </button>
                <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
                    Mis <span className="text-emerald-400">Turnos</span>
                </h1>
            </div>
             <div className="flex items-center gap-3">
                <img src={user?.user_metadata.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white/10" />
                <div>
                    <p className="font-bold text-sm text-white">{user?.user_metadata.full_name}</p>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-xs text-red-400 hover:text-red-300 transition-colors">Cerrar sesión</button>
                </div>
            </div>
        </header>

        <div className="space-y-12">
            <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Próximos Turnos</h2>
                {turnosFuturos.length > 0 ? (
                    <div className="space-y-4">
                        {turnosFuturos.map(turno => (
                           <div key={turno.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                     <p className="font-black text-xl uppercase italic" style={{color: getThemeColor(turno.negocio.tema)}}>{turno.negocio.nombre}</p>
                                     <p className="text-slate-300 font-bold mt-1">{turno.servicio.nombre}</p>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                                        {format(new Date(`${turno.fecha}T${turno.hora}`), "eeee dd 'de' MMMM, HH:mm 'hs'", { locale: es })}
                                     </p>
                                </div>
                               <div className="flex items-center gap-4 w-full md:w-auto">
                                    <button onClick={() => router.push(`/reservar/${turno.negocio.slug}`)} className="flex-1 md:flex-none px-6 py-4 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-colors">Reagendar</button>
                                    <button onClick={() => handleCancelarTurno(turno.id)} className="flex-1 md:flex-none px-6 py-4 rounded-xl text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/30 transition-colors">Cancelar</button>
                               </div>
                           </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border border-dashed border-white/10 rounded-[3rem]">
                        <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No tenés próximos turnos agendados.</p>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Historial de Turnos</h2>
                {turnosPasados.length > 0 ? (
                    <div className="space-y-3">
                        {turnosPasados.map(turno => {
                            const statusConfig: {[key: string]: {text: string, color: string}} = {
                                completado: { text: 'Completado', color: 'emerald' },
                                cancelado: { text: 'Cancelado', color: 'red' },
                                ausente: { text: 'Ausente', color: 'amber' }
                            }
                            const status = statusConfig[turno.estado] || { text: turno.estado, color: 'slate' };

                            return (
                               <div key={turno.id} className="bg-white/5 border border-white/5 rounded-[2rem] p-5 flex justify-between items-center opacity-70">
                                    <div>
                                         <p className="font-bold text-white/80">{turno.negocio.nombre}</p>
                                         <p className="text-sm text-slate-400 mt-1">{turno.servicio.nombre}</p>
                                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-2">
                                            {format(new Date(`${turno.fecha}T${turno.hora}`), "dd/MM/yyyy HH:mm", { locale: es })}
                                         </p>
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-${status.color}-500/10 text-${status.color}-400 border border-${status.color}-500/20`}>
                                            {status.text}
                                        </span>
                                    </div>
                               </div>
                            )
                        })}
                    </div>
                ) : (
                     <div className="text-center py-16 border border-dashed border-white/10 rounded-[3rem]">
                        <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Aún no tenés un historial de turnos.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}
