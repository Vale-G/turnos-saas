'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'

function toBaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date)
}

function getBaMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: BA_TZ, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date())
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

function getDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00-03:00`).getDay()
}

function generateDias() {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    return { 
      iso: toBaDateStr(d), 
      weekday: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, weekday: 'short' }).format(d), 
      day: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, day: 'numeric' }).format(d) 
    }
  })
}

export default function ReservaPage() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [sel, setSel] = useState<any>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [exito, setExito] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [misTurnos, setMisTurnos] = useState<any[]>([])
  const [verPerfil, setVerPerfil] = useState(false)

  const colorP = getThemeColor(negocio?.tema)
  const dias = useMemo(() => generateDias(), [])
  const diasLaborales: number[] = negocio?.dias_laborales ?? [1, 2, 3, 4, 5, 6]

  const cargarMisTurnos = useCallback(async (uid: string) => {
    const { data } = await supabase.from('turno').select('*, servicio(nombre, precio)').eq('cliente_id', uid).order('fecha', { ascending: false }).limit(5)
    setMisTurnos(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: neg } = await supabase.from('negocio').select('*').eq('slug', slug).single()
      if (!neg) return setLoading(false)
      setNegocio(neg)
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('servicio').select('*').eq('negocio_id', neg.id),
        supabase.from('staff').select('*').eq('negocio_id', neg.id).eq('activo', true),
      ])
      setServicios(svcs ?? [])
      setStaffList(stf ?? [])
      setLoading(false)
    }
    init()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); cargarMisTurnos(session.user.id) }
    })
  }, [slug, cargarMisTurnos])

  // Carga de Ocupados + Realtime
  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    
    async function check() {
      const { data } = await supabase.from('turno').select('hora').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      setOcupados((data ?? []).map((t: any) => t.hora.slice(0, 5)))
    }
    check()

    // Suscripción para que desaparezca el turno si otro lo reserva en tiempo real
    const channel = supabase.channel('public:turno')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turno', filter: `staff_id=eq.${sel.barbero.id}` }, () => {
        check() // Recarga los ocupados si hay un cambio
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sel.barbero, sel.fecha])

  const horas = useMemo(() => {
    if (!negocio || !sel.servicio || !sel.fecha) return []
    const list: string[] = []
    let curr = negocio.hora_apertura || '09:00:00'
    const cierre = negocio.hora_cierre || '18:00:00'
    const esHoy = sel.fecha === toBaDateStr(new Date())
    const minLimite = esHoy ? getBaMinutes() + 15 : 0

    while (curr < cierre) {
      const hF = curr.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      if (!ocupados.includes(hF) && (!esHoy || (hh * 60 + mm) >= minLimite)) list.push(hF)
      let [h, m] = curr.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      curr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    }
    return list
  }, [negocio, sel.servicio, sel.fecha, ocupados])

  const handleFinal = async (nombre: string, tel: string, pagarSena: boolean = false) => {
    setConfirmando(true)
    const cliNombre = user ? (user.user_metadata?.full_name || user.email) : `${nombre} · ${tel}`
    
    // Verificamos si justo alguien nos ganó de mano (doble chequeo de seguridad)
    const { data: colision } = await supabase.from('turno').select('id').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).eq('hora', sel.hora + ':00').not('estado', 'eq', 'cancelado').single()
    if (colision) {
      toast.error('¡Ups! Alguien acaba de reservar este horario. Por favor elegí otro.')
      setSel({...sel, hora: ''})
      setConfirmando(false)
      return
    }
    
    const { data: turno, error } = await supabase.from('turno').insert({
      negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id,
      fecha: sel.fecha, hora: sel.hora + ':00', cliente_id: user?.id || null,
      cliente_nombre: cliNombre, estado: 'pendiente'
    }).select('id').single()

    if (error) {
      toast.error('Error al reservar turno.')
      setConfirmando(false)
      return
    }

    if (pagarSena && sel.servicio.precio > 0) {
      toast.info('Redirigiendo a MercadoPago...')
      const montoSena = Math.round(sel.servicio.precio * 0.5)
      
      const res = await fetch('/api/sena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turno_id: turno.id, monto_sena: montoSena, servicio_nombre: sel.servicio.nombre,
          negocio_nombre: negocio.nombre, cliente_email: user ? user.email : 'invitado@turnly.app'
        })
      })
      
      const resData = await res.json()
      if (resData.url) { window.location.href = resData.url; return } 
      else { toast.error('Negocio sin MP configurado. Turno agendado igual.') }
    }

    setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic uppercase text-2xl text-white animate-pulse tracking-tighter">CARGANDO RESERVA...</div>
  if (!negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white"><p className="font-black uppercase italic text-slate-500 text-xl">Negocio no encontrado</p></div>

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20">
      <div className="max-w-md mx-auto px-6">
        <header className="py-8 flex items-center justify-between border-b border-white/5 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10 shadow-lg" style={{ background: colorP + '20', color: colorP }}>{negocio.nombre[0]}</div>
            <div><h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none" style={{ color: colorP }}>{negocio.nombre}</h1><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Reserva online</p></div>
          </div>
          {user && <button onClick={() => setVerPerfil(!verPerfil)} className="w-12 h-12 rounded-full border border-white/10 overflow-hidden bg-white/5 flex-shrink-0 active:scale-95 transition-transform"><img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} alt="P" className="w-full h-full object-cover" /></button>}
        </header>

        {verPerfil && user && (
          <div className="bg-white/4 border border-white/8 rounded-[3rem] p-8 mb-10 animate-in zoom-in-95">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Historial de Citas</p>
            <div className="space-y-3 mb-8">
              {misTurnos.length === 0 ? <p className="text-[10px] text-slate-600 italic">Sin turnos recientes.</p> : misTurnos.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div><p className="text-sm font-black uppercase italic tracking-tight text-white/90">{t.servicio?.nombre}</p><p className="text-[10px] text-slate-500 mt-1 font-bold tracking-widest">{t.fecha} · {t.hora?.slice(0, 5)} HS</p></div>
                  <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">{t.estado}</span>
                </div>
              ))}
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full py-4 rounded-2xl border border-red-500/20 text-red-400 text-[10px] font-black uppercase hover:bg-red-500/10 transition-colors tracking-widest">Cerrar Sesión</button>
          </div>
        )}

        {exito ? (
          <div className="pt-20 text-center animate-in zoom-in-95 duration-500">
            <div className="w-28 h-28 rounded-full border-4 mx-auto mb-8 flex items-center justify-center text-5xl" style={{ borderColor: colorP, color: colorP, boxShadow: `0 0 80px ${colorP}30` }}>✓</div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">¡Turno Listo!</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">{sel.fecha} A LAS {sel.hora} HS</p>
            <p className="text-slate-600 text-[10px] uppercase font-black tracking-widest mb-12">CON {sel.barbero?.nombre}</p>
            <button onClick={() => window.location.reload()} className="font-black uppercase italic text-lg px-12 py-5 rounded-[2rem] text-black transition-all hover:scale-105 shadow-xl" style={{ backgroundColor: colorP }}>Genial</button>
          </div>
        ) : paso === 1 ? (
          <div className="animate-in fade-in duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Elegí un servicio</p>
            <div className="space-y-4">
              {servicios.map(s => (
                <div key={s.id} onClick={() => { setSel({ ...sel, servicio: s }); setPaso(2) }} className="bg-white/4 border border-white/5 hover:border-white/20 p-8 rounded-[3rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] group">
                  <div><p className="font-black italic uppercase text-2xl mb-1 tracking-tighter transition-all" style={{ color: colorP }}>{s.nombre}</p><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{s.duracion} MINUTOS</p></div>
                  <p className="text-3xl font-black italic">${s.precio.toLocaleString('es-AR')}</p>
                </div>
              ))}
            </div>
          </div>
        ) : paso === 2 ? (
          <div className="space-y-12 animate-in slide-in-from-right-4 duration-500">
            <button onClick={() => { setPaso(1); setSel({ ...sel, barbero: null, fecha: '', hora: '' }) }} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors">← Volver</button>
            <div className="bg-white/4 border border-white/5 rounded-3xl px-6 py-4 flex justify-between items-center backdrop-blur-md">
              <div><p className="font-black uppercase text-base italic" style={{ color: colorP }}>{sel.servicio?.nombre}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{sel.servicio?.duracion} MIN</p></div>
              <p className="font-black text-xl italic">${sel.servicio?.precio?.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Staff Disponible</p>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => {
                  const activo = sel.barbero?.id === st.id
                  return (
                    <div key={st.id} onClick={() => setSel({ ...sel, barbero: st, fecha: '', hora: '' })} className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border cursor-pointer transition-all text-center ${activo ? 'border-transparent shadow-xl' : 'bg-white/4 border-white/5 hover:border-white/20'}`} style={activo ? { backgroundColor: colorP } : {}}>
                      <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center font-black text-2xl ${activo ? 'bg-black/20 text-white' : 'bg-white/10 text-white'}`}>{st.nombre[0]}</div>
                      <p className={`text-[10px] font-black uppercase tracking-widest truncate ${activo ? 'text-black' : 'text-slate-400'}`}>{st.nombre}</p>
                    </div>
                  )
                })}
              </div>
            </div>
            {sel.barbero && (
              <div className="animate-in fade-in duration-700">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Días Hábiles</p>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {dias.map(({ iso, weekday, day }) => {
                    const esLaboral = diasLaborales.includes(getDayOfWeek(iso))
                    const activo = sel.fecha === iso
                    return (
                      <div key={iso} onClick={() => esLaboral && setSel({ ...sel, fecha: iso, hora: '' })} className={`flex-shrink-0 w-16 h-24 rounded-[2rem] border flex flex-col items-center justify-center transition-all ${!esLaboral ? 'opacity-20 cursor-not-allowed bg-white/2 border-white/5' : activo ? 'border-transparent shadow-lg cursor-pointer' : 'bg-white/4 border-white/5 hover:border-white/20 cursor-pointer'}`} style={activo && esLaboral ? { backgroundColor: colorP } : {}}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${activo ? 'text-black' : 'text-slate-500'}`}>{weekday}</p>
                        <p className={`text-2xl font-black ${activo ? 'text-black' : 'text-white'}`}>{day}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {sel.fecha && (
              <div className="animate-in fade-in duration-700">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Horarios</p>
                {horas.length === 0 ? (
                  <div className="text-center py-10 bg-white/4 rounded-[3rem] border border-dashed border-white/10"><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Sin Cupos</p></div>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {horas.map(h => {
                      const activo = sel.hora === h
                      return <div key={h} onClick={() => setSel({ ...sel, hora: h })} className={`py-5 rounded-2xl text-[11px] font-black text-center cursor-pointer transition-all border ${activo ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5 hover:border-white/20'}`} style={activo ? { backgroundColor: colorP, color: 'black' } : {}}>{h}</div>
                    })}
                  </div>
                )}
              </div>
            )}
            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black transition-all hover:scale-[1.02] shadow-2xl mt-4" style={{ backgroundColor: colorP }}>Revisar y Confirmar</button>}
          </div>
        ) : (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors tracking-widest">← Volver</button>
            <div className="bg-white/4 border border-white/5 rounded-[4rem] p-10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-8 text-center">Ticket de Reserva</p>
              <div className="text-center mb-10 space-y-3">
                <p className="text-4xl font-black italic uppercase leading-none tracking-tighter" style={{ color: colorP }}>{sel.servicio?.nombre}</p>
                <p className="font-black uppercase text-xs tracking-[0.3em] text-white pt-2">{sel.fecha} · {sel.hora} HS</p>
                <p className="font-black uppercase text-[10px] text-slate-500 tracking-widest">Profesional: {sel.barbero?.nombre}</p>
                <p className="text-4xl font-black pt-4">${sel.servicio?.precio?.toLocaleString('es-AR')}</p>
              </div>
              <AuthSelector user={user} colorP={colorP} loading={confirmando} onConfirm={handleFinal} slug={slug} precio={sel.servicio?.precio} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthSelector({ user, colorP, loading, onConfirm, slug, precio }: any) {
  const [modo, setModo] = useState('invitado')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')

  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) } })

  const renderBotonesFinales = (onClickAccion: (pagarSena: boolean) => void) => (
    <div className="space-y-3 mt-6">
      {precio > 0 && (
        <button onClick={() => onClickAccion(true)} disabled={loading} className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-sm text-black transition-all hover:opacity-90 disabled:opacity-50 active:scale-95 shadow-xl relative overflow-hidden" style={{ backgroundColor: colorP }}>
          <span className="relative z-10 flex flex-col">
            <span>Abonar Seña (50%) Ahora</span>
            <span className="text-[10px] font-bold opacity-70 mt-1">Con MercadoPago - Asegurá tu lugar</span>
          </span>
        </button>
      )}
      <button onClick={() => onClickAccion(false)} disabled={loading} className="w-full py-5 rounded-[2.5rem] font-black uppercase italic text-xs text-white bg-white/5 border border-white/10 transition-all hover:bg-white/10 disabled:opacity-50 active:scale-95">
        {loading ? 'PROCESANDO...' : 'RESERVAR Y PAGAR EN EL LOCAL'}
      </button>
    </div>
  )

  if (user) return renderBotonesFinales((sena) => onConfirm('', '', sena))

  return (
    <div className="space-y-6">
      <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5">
        <button onClick={() => setModo('invitado')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'invitado' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600'}`}>Invitado</button>
        <button onClick={() => setModo('google')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'google' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600'}`}>Google</button>
      </div>

      {modo === 'google' ? (
        <button onClick={login} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[2rem] hover:bg-slate-200 transition-colors shadow-lg active:scale-95 mt-4">Ingresar con Google</button>
      ) : (
        <div className="space-y-4">
          <input type="text" placeholder="TU NOMBRE (EJ: JUAN PEREZ)" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase tracking-widest outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
          <input type="tel" placeholder="WHATSAPP (EJ: 1123456789)" value={tel} onChange={e => setTel(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase tracking-widest outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
          {renderBotonesFinales((sena) => onConfirm(nombre, tel, sena))}
        </div>
      )}
    </div>
  )
}
