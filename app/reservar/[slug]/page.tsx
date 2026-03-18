'use client'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useParams } from 'next/navigation'

type NegocioTema = {
  id: string
  nombre: string
  slug?: string
  tema?: string
  hora_apertura?: string
  hora_cierre?: string
  dias_laborales?: number[]
}

type ServicioItem = {
  id: string
  nombre: string
  precio: number
  duracion: number
}

type StaffItem = {
  id: string
  nombre: string
}

type TurnoHistorial = {
  id: string
  fecha: string
  hora: string
  estado: string
  Servicio?: { nombre: string }
}

export default function ReservaPro() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<NegocioTema | null>(null)
  const [servicios, setServicios] = useState<ServicioItem[]>([])
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [misTurnos, setMisTurnos] = useState<TurnoHistorial[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [user, setUser] = useState<User | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)
  const [sel, setSel] = useState({ servicio: null as ServicioItem | null, barbero: null as StaffItem | null, fecha: '', hora: '' })

  useEffect(() => {
    const init = async () => {
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (!neg) return setLoading(false)
      setNegocio(neg)

      const [ser, stf] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', neg.id),
        supabase.from('Staff').select('*').eq('negocio_id', neg.id).eq('activo', true)
      ])

      setServicios(ser.data || [])
      setStaff(stf.data || [])
      setLoading(false)
    }

    init()
  }, [slug])

  useEffect(() => {
    const obtenerTurnos = async (userId: string) => {
      const { data: tuns } = await supabase
        .from('Turno')
        .select('*, Servicio(nombre)')
        .eq('cliente_id', userId)
        .order('fecha', { ascending: false })
        .limit(10)

      setMisTurnos(tuns || [])
    }

    const syncAuth = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await obtenerTurnos(session.user.id)
      }
    }

    syncAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        obtenerTurnos(session.user.id)
      } else {
        setUser(null)
        setMisTurnos([])
      }
    })

    return () => listener?.subscription?.unsubscribe?.()
  }, [])

  useEffect(() => {
    if (sel.barbero && sel.fecha) {
      supabase.from('Turno').select('hora').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      .then(({ data }) => { if (data) setOcupados(data.map(t => t.hora.slice(0, 5))) })
    }
  }, [sel.barbero, sel.fecha])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const loginGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}${window.location.pathname}` }
    })

  const generarHoras = () => {
    if (!negocio || !sel.servicio) return []
    const lista = []; let act = negocio.hora_apertura; const cie = negocio.hora_cierre
    while (act < cie) {
      const hF = act.slice(0, 5)
      if (!ocupados.includes(hF)) lista.push(hF)
      let [h, m] = act.split(':').map(Number); m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m/60); m %= 60 }; act = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:00`
    }
    return lista
  }

  const colorP = getThemeColor(negocio?.tema)

  const progress = useMemo(() => {
    const mapping: Record<number, number> = { 1: 25, 2: 50, 3: 75, 4: 100, 5: 100 }
    return mapping[paso] ?? 0
  }, [paso])

  const etiquetaDia = (date: Date) => {
    const dia = date.toLocaleDateString('es-ES', { weekday: 'short' })
    const nombre = dia.charAt(0).toUpperCase() + dia.slice(1)
    return `${nombre} ${date.getDate()}`
  }

  const estadoColor = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-amber-500',
      confirmado: 'bg-emerald-500',
      cancelado: 'bg-rose-500'
    }
    return map[estado] || 'bg-slate-500'
  }

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-emerald-500 uppercase">
        Barbucho Pro...
      </div>
    )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans selection:bg-emerald-500">
      <div className="max-w-md mx-auto">
        
        {/* HEADER */}
        <header className="sticky top-0 z-50 bg-[#020617]/70 backdrop-blur-md border-b border-white/10 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg uppercase border border-white/10"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: colorP }}
              >
                {negocio?.nombre?.charAt(0) || 'B'}
              </div>
              <div>
                <p className="text-xs font-black italic tracking-wide" style={{ color: colorP }}>
                  {negocio?.nombre}
                </p>
                <p className="text-[10px] text-slate-400">Reserva en línea</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  onClick={() => setVerHistorial(true)}
                  className="flex items-center gap-2 rounded-full border border-white/10 p-1.5 bg-white/5 hover:bg-white/10 transition"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      width={32}
                      height={32}
                      unoptimized
                      className="w-8 h-8 rounded-full border border-white/10"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    >
                      {user.user_metadata?.full_name?.[0] ?? 'U'}
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest">Perfil</span>
                </button>
              ) : (
                <button
                  onClick={loginGoogle}
                  className="rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 transition"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>

          {paso > 0 && paso < 5 && (
            <div className="mt-4 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${colorP} 0%, ${colorP} 70%, rgba(255,255,255,0.25) 100%)`,
                }}
              />
            </div>
          )}
        </header>

        {/* HISTORIAL (MODAL) */}
        {verHistorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl bg-[#020617] border border-white/10 p-6 shadow-xl animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black uppercase italic" style={{ color: colorP }}>
                    Mis turnos
                  </h2>
                  <p className="text-[10px] text-slate-500">Arrastra hacia abajo o cierra para volver.</p>
                </div>
                <button
                  onClick={() => setVerHistorial(false)}
                  className="text-slate-400 hover:text-white text-xs font-black"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5 space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                {misTurnos.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Aún no tenés turnos reservados.</p>
                ) : (
                  misTurnos.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border p-4 bg-white/5 flex justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black uppercase">{t.Servicio?.nombre}</span>
                        <span className="text-[10px] text-slate-400">
                          {t.fecha} • {t.hora.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${estadoColor(
                            t.estado
                          )}`}
                        >
                          {t.estado}
                        </span>
                        <span className="text-[9px] text-slate-400">ID {t.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: SERVICIOS */}
        {paso === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center mb-6 tracking-widest italic">— Elegí Servicio —</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({...sel, servicio: s}); setPaso(2) }} className="w-full bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center active:scale-95 transition-all">
                <div className="text-left"><h3 className="font-black uppercase italic text-lg">{s.nombre}</h3><p className="text-slate-500 text-[10px]">{s.duracion} MIN</p></div>
                <span className="text-xl font-black italic" style={{ color: colorP }}>${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {/* PASO 2: STAFF */}
        {paso === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            <div className="grid grid-cols-2 gap-4">
              {staff.map(p => (
                <button key={p.id} onClick={() => { setSel({...sel, barbero: p}); setPaso(3) }} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] text-center active:scale-95">
                  <div className="w-12 h-12 bg-white/5 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl border border-white/10" style={{ color: colorP }}>{p.nombre[0]}</div>
                  <h3 className="font-black uppercase italic text-xs">{p.nombre}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: DÍA */}
        {paso === 3 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            {[0,1,2,3,4,5,6].map(o => {
              const d = new Date(); d.setDate(d.getDate() + o); const iso = d.toISOString().split('T')[0]
              const lab = negocio?.dias_laborales?.includes(new Date(iso + 'T00:00:00').getDay())
              return (
                <button key={iso} disabled={!lab} onClick={() => { setSel({...sel, fecha: iso}); setPaso(4) }} className={`w-full p-6 rounded-[2.5rem] border flex justify-between items-center transition-all ${!lab ? 'opacity-20 grayscale border-transparent' : 'bg-slate-900/40 border-white/5 active:scale-95'}`}>
                   <span className="font-black italic uppercase text-lg">{etiquetaDia(d)}</span>
                   {lab && <span style={{ color: colorP }} className="font-black italic text-[10px]">VER HORAS</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* PASO 4: HORA Y LOGIN OBLIGATORIO */}
        {paso === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
            <button onClick={() => setPaso(3)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            <div className="grid grid-cols-3 gap-2">
              {generarHoras().map(h => (
                <button key={h} onClick={() => setSel({...sel, hora: h})} className={`py-4 rounded-xl font-black text-xs border ${sel.hora === h ? 'bg-white text-black border-white' : 'bg-slate-900/40 border-white/5'}`}>{h}</button>
              ))}
            </div>
            
            {sel.hora && (
              <div className="mt-8 bg-slate-900/80 p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                {!user ? (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase text-emerald-500 italic">Casi listo! Necesitás identificarte:</p>
                    <button onClick={loginGoogle} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-2xl flex items-center justify-center gap-3">
                      <Image
                        src="https://www.google.com/favicon.ico"
                        width={16}
                        height={16}
                        unoptimized
                        className="w-4 h-4"
                        alt="G"
                      />
                      Continuar con Google
                    </button>
                  </div>
                ) : (
                  <button onClick={async () => {
                    setLoading(true)
                    await supabase.from('Turno').insert([{ negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id, fecha: sel.fecha, hora: sel.hora+':00', cliente_nombre: user.user_metadata.full_name, cliente_id: user.id, estado: 'pendiente' }])
                    setLoading(false); setPaso(5)
                  }} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg shadow-xl" style={{ backgroundColor: colorP, color: 'black' }}>Confirmar Turno</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 5: ÉXITO */}
        {paso === 5 && (
          <div className="text-center py-20 animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_50px_rgba(16,185,129,0.3)]">✓</div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">¡Turno Confirmado!</h2>
            <p className="text-slate-500 font-bold uppercase text-[9px] mt-2">Aparecerá en &apos;Mis Turnos&apos;</p>
            <button onClick={() => window.location.reload()} className="mt-12 text-[10px] font-black uppercase text-slate-700 border-b border-slate-900 pb-1">Finalizar</button>
          </div>
        )}

      </div>
    </div>
  )
}