'use client'
import { downloadFile, reservationCalendar } from '@/lib/downloads'
import { useEffect, useState, useMemo, type CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import { getAppearance } from '@/lib/personalization.mjs'

type NegocioPublico = {
  politica_sena: string | null;
  id: string; nombre: string; descripcion: string | null; logo_url: string | null
  horas_cancelacion: number; horas_reprogramacion: number; tema: string | null; dias_laborales: number[] | null
  rubro: string | null; estilo_visual: string | null; modo_visual: string | null
  banner_url: string | null; mensaje_bienvenida: string | null
}
type ServicioPublico = {
  politica_sena: string | null;
  id: string; nombre: string; descripcion: string | null; precio: number
  duracion: number; seña_tipo: 'ninguno' | 'fijo' | 'porcentaje' | null; seña_valor: number | null
}
type ProfesionalPublico = { id: string; nombre: string; avatar_url: string | null }
type Seleccion = { servicio: ServicioPublico | null; barbero: ProfesionalPublico | null; fecha: string; hora: string }

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }
function getDayOfWeek(dateStr: string): number { return new Date(`${dateStr}T12:00:00-03:00`).getDay() }
function generateDias() {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    return { iso: toBaDateStr(d), weekday: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, weekday: 'short' }).format(d), day: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, day: 'numeric' }).format(d) }
  })
}

export default function ReservaPage() {
  const { slug } = useParams<{ slug: string }>()
  const [negocio, setNegocio] = useState<NegocioPublico | null>(null)
  const [servicios, setServicios] = useState<ServicioPublico[]>([])
  const [staffList, setStaffList] = useState<ProfesionalPublico[]>([])
  const [horas, setHoras] = useState<string[]>([])
  const [horariosCargando, setHorariosCargando] = useState(false)
  const [horariosError, setHorariosError] = useState(false)
  const [horariosReintento, setHorariosReintento] = useState(0)
  const [contact, setContact] = useState({ nombre: '', tel: '', correo: '' })
  const [catalogError, setCatalogError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [sel, setSel] = useState<Seleccion>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [exito, setExito] = useState(false)
  const [gestionUrl, setGestionUrl] = useState('')
  const [reservationId, setReservationId] = useState('')
  const [user, setUser] = useState<User | null>(null)

  const colorP = getThemeColor(negocio?.tema)
  const appearance = getAppearance({
    businessType: negocio?.rubro,
    visualStyle: negocio?.estilo_visual,
    visualMode: negocio?.modo_visual,
  })
  const cardStyle = { background: "var(--booking-card)", borderColor: "var(--booking-line)", borderRadius: appearance.radius }
  const dias = useMemo(() => generateDias(), [])
  const diasLaborales: number[] = negocio?.dias_laborales ?? [1, 2, 3, 4, 5, 6]

  useEffect(() => {
    let active = true
    async function init() {
      try {
        const response = await fetch(`/api/public/negocios/${encodeURIComponent(String(slug))}`, { cache: 'no-store' })
        if (response.status === 404) return
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!active) return
        setNegocio(data.negocio)
        setServicios(data.servicios ?? [])
        setStaffList(data.staff ?? [])
      } catch {
        if (active) setCatalogError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    void init()
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => { if (active) {
      setUser(currentUser)
      if (currentUser) setContact(previous => ({ ...previous, nombre: previous.nombre || currentUser.user_metadata?.full_name || '', correo: previous.correo || currentUser.email || '' }))
    } })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!negocio || !sel.servicio || !sel.barbero || !sel.fecha) return
    const negocioId = negocio.id
    const servicioId = sel.servicio.id
    const staffId = sel.barbero.id
    const fecha = sel.fecha
    let vigente = true
    async function check() {
      try {
        const query = new URLSearchParams({
          negocioId,
          servicioId,
          staffId,
          fecha,
        })
        const response = await fetch(`/api/public/disponibilidad?${query}`, { cache: 'no-store' })
        if (!vigente) return
        if (!response.ok) {
          setHorariosError(true)
          return
        }
        const data = await response.json()
        if (!Array.isArray(data.horarios) || data.horarios.some((hora: unknown) => typeof hora !== 'string')) {
          setHorariosError(true)
          return
        }
        setHoras(data.horarios)
      } catch {
        if (vigente) setHorariosError(true)
      } finally {
        if (vigente) setHorariosCargando(false)
      }
    }
    void check()
    return () => { vigente = false }
  }, [negocio, sel.servicio, sel.barbero, sel.fecha, horariosReintento])

  // EL CEREBRO DE LAS SEÑAS FLEXIBLES
  const policy = sel.servicio?.politica_sena ?? negocio?.politica_sena
  const svc = sel.servicio
  const montoSenaCalculado = !svc || policy === 'ninguna' ? 0 : svc.seña_tipo === 'fijo'
    ? Math.min(svc.precio, Number(svc.seña_valor))
    : svc.seña_tipo === 'porcentaje' ? Math.round(svc.precio * Math.min(100, Number(svc.seña_valor))) / 100 : 0
  const [awaitingPayment,setAwaitingPayment] = useState(false)

  const handleFinal = async (nombre: string, tel: string, pagarSena: boolean, correoInvitado: string) => {
    // Protección de UI; el servidor todavía debe validar disponibilidad atómicamente.
    if (horariosCargando || horariosError || !negocio || !sel.servicio || !sel.barbero || !sel.fecha || !sel.hora || !horas.includes(sel.hora)) {
      toast.error('El horario ya no está disponible. Elegí otro turno.')
      setPaso(2)
      return
    }
    const negocioId = negocio.id
    const servicioId = sel.servicio.id
    const staffId = sel.barbero.id
    setConfirmando(true)
    let response: Response
    try {
      response = await fetch('/api/public/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId,
          servicioId,
          staffId,
          fecha: sel.fecha,
          hora: sel.hora,
          nombre,
          pagarSena, telefono: tel,
          email: correoInvitado,
        }),
      })
    } catch {
      setConfirmando(false)
      toast.error('Se cortó la conexión. Consultá con el comercio si recibió el turno antes de volver a reservar.')
      return
    }
    const booking = await response.json().catch(() => null)
    if (!response.ok || !booking?.id || !booking?.manageToken) {
      toast.error(booking?.error ?? 'No pudimos verificar la reserva. Consultá con el comercio.')
      setConfirmando(false)
      if (response.status === 409 && booking?.code === 'slot_conflict') {
        setSel(current => ({ ...current, hora: '' }))
        setHorariosReintento(n => n + 1)
        setPaso(2)
      }
      return
    }
    if (!booking.obligatoria) void fetch('/api/notificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ turnoId: booking.id, manageToken: booking.manageToken }),
    }).catch(() => undefined)

    // 3. Pagar Seña Exacta a MercadoPago
    if (pagarSena && montoSenaCalculado > 0) {
      try {
        const res = await fetch('/api/sena', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turno_id: booking.id, manage_token: booking.manageToken })
      })
      const resData = await res.json().catch(() => ({}))
      if (res.ok && resData.url) {
        sessionStorage.setItem('turnly-reserva-'+booking.id,booking.manageToken)
        window.location.assign(resData.url); return
      }
      toast.error('No se pudo iniciar el pago de la seña.')
      } catch { toast.error('No se pudo abrir el pago. Conservá el enlace de gestión.') }
    }

    setAwaitingPayment(Boolean(booking.obligatoria))
    setReservationId(booking.id)
    setGestionUrl(`/cancelar/${booking.id}?token=${booking.manageToken}`)
    setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">CARGANDO...</div>
  if (catalogError) return <main className="p-6"><p role="alert">No pudimos cargar los servicios del comercio.</p><button className="mt-3 underline" onClick={() => window.location.reload()}>Reintentar</button></main>
  if (!negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-slate-500">NEGOCIO NO ENCONTRADO</div>

  return (
    <div className="booking min-h-screen pb-20" data-mode={appearance.visualMode} style={{ "--brand": colorP } as CSSProperties}>
      <div className="max-w-md mx-auto px-6">
        {negocio.banner_url && <Image src={negocio.banner_url} alt={`Bienvenida a ${negocio.nombre}`} width={800} height={300} unoptimized className="mt-6 w-full h-40 object-cover rounded-2xl" />}
        <header className="py-8 flex items-center justify-between border-b mb-8" style={{ borderColor: appearance.border }}>
          <div className="flex items-center gap-4">
            {negocio.logo_url ? <Image src={negocio.logo_url} alt={`Logo de ${negocio.nombre}`} width={56} height={56} unoptimized className="w-14 h-14 rounded-2xl object-cover border border-white/10" /> : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10" style={{ background: colorP + '20', color: colorP }}>{negocio.nombre[0]}</div>}
            <div><h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: "var(--booking-ink)", letterSpacing: appearance.tracking }}>{negocio.nombre}</h1><p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1" style={{ color: appearance.muted }}>Reserva online</p></div>
          </div>
        </header>
        {negocio.mensaje_bienvenida && <p className="mb-6 whitespace-pre-wrap">{negocio.mensaje_bienvenida}</p>}
        {user && <a href="/mis-turnos" className="block mb-6 underline">Mis reservas</a>}

        {!exito && <p aria-live="polite" className="mb-4 text-sm">Paso {paso} de 3 · {["Servicio", "Fecha y horario", "Confirmación"][paso - 1]}</p>}
        {exito ? (
          <div role="status" className="pt-20 text-center animate-in zoom-in-95">
            <div className="w-28 h-28 rounded-full border-4 mx-auto mb-8 flex items-center justify-center text-5xl" style={{ borderColor: colorP, color: colorP, boxShadow: `0 0 80px ${colorP}30` }}>✓</div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">{awaitingPayment ? 'Pendiente de seña' : '¡Turno Listo!'}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-12">{sel.fecha} A LAS {sel.hora} HS</p>
            {gestionUrl && <a href={gestionUrl} className="block text-sm font-bold underline underline-offset-4 mb-8" style={{ color: "var(--booking-ink)" }}>Guardar enlace para gestionar o cancelar</a>}
            {!awaitingPayment && sel.servicio && <button type="button" className="mb-3 min-h-11 w-full rounded-xl border px-4"
              onClick={() => {
                if (!sel.servicio) return
                const calendar = reservationCalendar({ id: reservationId, day: sel.fecha, time: sel.hora,
                  duration: sel.servicio.duracion, business: negocio.nombre, service: sel.servicio.nombre })
                if (calendar) downloadFile('turno-turnly.ics', calendar, 'text/calendar;charset=utf-8')
              }}>Agregar a mi calendario</button>}
            <button onClick={() => window.location.reload()} className="font-black uppercase italic text-lg px-12 py-5 rounded-[2rem] text-black shadow-xl" style={{ backgroundColor: colorP }}>Genial</button>
          </div>
        ) : paso === 1 ? (
          <div className="animate-in fade-in">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Elegí un servicio</p>
            <div className="space-y-4">
              {servicios.length === 0 && <p>El comercio todavía no publicó servicios para reservar.</p>}
              {servicios.map(s => (
                <button type="button" key={s.id} onClick={() => { setSel({ servicio: s, barbero: null, fecha: '', hora: '' }); setHoras([]); setPaso(2) }} className="w-full text-left gap-3 border p-5 flex justify-between items-center cursor-pointer transition-all active:scale-[0.98]" style={cardStyle}>
                  <div><p className="font-black italic uppercase text-2xl mb-1 tracking-tighter" style={{ color: "var(--booking-ink)" }}>{s.nombre}</p><p className="text-[10px] text-slate-500 font-black uppercase">{s.duracion} MINUTOS</p>{s.descripcion && <p className="mt-1 text-sm">{s.descripcion}</p>}</div>
                  <span className="shrink-0 whitespace-nowrap text-xl font-semibold">${s.precio.toLocaleString("es-AR")}</span>
                </button>
              ))}
            </div>
          </div>
        ) : paso === 2 ? (
          <div className="space-y-12 animate-in slide-in-from-right-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white">← Volver</button>
            <div className="border px-6 py-4 flex justify-between items-center" style={cardStyle}>
              <div><p className="font-black uppercase text-base italic" style={{ color: "var(--booking-ink)" }}>{sel.servicio?.nombre}</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{sel.servicio?.duracion} MIN</p></div>
              <p className="font-black text-xl italic">${sel.servicio?.precio}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Profesional</p>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => (
                  <button type="button" aria-pressed={sel.barbero?.id === st.id} key={st.id} onClick={() => setSel({ ...sel, barbero: st, fecha: '', hora: '' })} className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border cursor-pointer text-center ${sel.barbero?.id === st.id ? 'border-transparent shadow-xl' : 'bg-white/4 border-white/5'}`} style={sel.barbero?.id === st.id ? { backgroundColor: colorP } : {}}>
                    <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center font-black text-2xl ${sel.barbero?.id === st.id ? 'bg-black/20 text-white' : 'bg-white/10'}`}>{st.nombre[0]}</div>
                    <p className={`text-[10px] font-black uppercase truncate ${sel.barbero?.id === st.id ? 'text-black' : 'text-slate-400'}`}>{st.nombre}</p>
                  </button>
                ))}
              </div>
            </div>
            {sel.barbero && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Fecha</p>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {dias.map(({ iso, weekday, day }) => {
                    const esLaboral = diasLaborales.includes(getDayOfWeek(iso))
                    const activo = sel.fecha === iso
                    return <button type="button" disabled={!esLaboral} aria-pressed={activo} aria-label={iso} key={iso} onClick={() => { if (!esLaboral) return; setHorariosCargando(true); setHorariosError(false); setHorariosReintento((n) => n + 1); setSel({ ...sel, fecha: iso, hora: '' }) }} className={`flex-shrink-0 w-16 h-24 rounded-[2rem] border flex flex-col items-center justify-center ${!esLaboral ? 'opacity-20' : activo ? 'border-transparent' : 'bg-white/4 border-white/5'}`} style={activo && esLaboral ? { backgroundColor: colorP } : {}}><p className={`text-[9px] font-black uppercase mb-2 ${activo?'text-black':'text-slate-500'}`}>{weekday}</p><p className={`text-2xl font-black ${activo?'text-black':''}`}>{day}</p></button>
                  })}
                </div>
              </div>
            )}
            {sel.fecha && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Horarios Libres</p>
                {horariosCargando ? <div role="status" className="text-center py-10 text-slate-400 text-xs">Verificando disponibilidad...</div> : horariosError ? <div className="text-center py-6 text-slate-600 dark:text-amber-300">
                  <p role="alert" className="text-sm">No se pudieron verificar los horarios.</p>
                  <button type="button" className="mt-2 min-h-11 px-4 text-sm underline" onClick={() => {
                    setHorariosError(false)
                    setHorariosCargando(true)
                    setHorariosReintento(n => n + 1)
                  }}>Reintentar</button>
                </div> : horas.length === 0 ? <div className="text-center py-10 bg-white/4 rounded-[3rem] border border-dashed border-white/10"><p className="text-slate-500 text-[10px] font-black uppercase">Sin Cupos</p></div> : (
                  <div className="grid grid-cols-4 gap-3">
                    {horas.map(h => <button type="button" aria-pressed={sel.hora === h} key={h} onClick={() => setSel({ ...sel, hora: h })} className={`py-5 rounded-2xl text-[11px] font-black text-center cursor-pointer border ${sel.hora === h ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5'}`} style={sel.hora === h ? { backgroundColor: colorP, color: 'black' } : {}}>{h}</button>)}
                  </div>
                )}
              </div>
            )}
            {!horariosCargando && !horariosError && sel.hora && horas.includes(sel.hora) && <button onClick={() => setPaso(3)} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black shadow-2xl mt-4" style={{ backgroundColor: colorP }}>Continuar</button>}
          </div>
        ) : (
          <div className="space-y-8 animate-in zoom-in-95">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            <div className="border p-10" style={cardStyle}>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-8 text-center">Ticket de Reserva</p>
              <div className="text-center mb-10 space-y-3">
                <p className="text-4xl font-black italic uppercase leading-none" style={{ color: "var(--booking-ink)" }}>{sel.servicio?.nombre}</p>
                <p className="font-black uppercase text-xs tracking-[0.3em] pt-2">{sel.fecha} · {sel.hora} hs · {sel.servicio?.duracion} min</p>
                <p className="text-4xl font-black pt-4">${sel.servicio?.precio}</p>
                {montoSenaCalculado > 0 && <p className="text-[10px] font-black uppercase text-emerald-400 pt-2 tracking-widest">{policy === 'obligatoria' ? 'Seña obligatoria' : 'Seña opcional'}: ${montoSenaCalculado}</p>}
              </div>
              <p className="mb-4 text-sm">Anticipación para cancelar: {negocio.horas_cancelacion} h · Reprogramar: {negocio.horas_reprogramacion} h</p>
              <AuthSelector contact={contact} setContact={setContact} obligatoria={policy === 'obligatoria'} key={user?.id ?? 'guest'} user={user} colorP={colorP} loading={confirmando} onConfirm={handleFinal} slug={slug} montoSena={montoSenaCalculado} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type Contact = { nombre: string; tel: string; correo: string }
type AuthSelectorProps = {
  contact: Contact
  setContact: (value: Contact) => void
  obligatoria: boolean
  user: User | null
  colorP: string
  loading: boolean
  onConfirm: (nombre: string, telefono: string, pagarSena: boolean, email: string) => Promise<void>
  slug: string
  montoSena: number
}

function AuthSelector({ contact, setContact, user, colorP, loading, onConfirm, slug, montoSena, obligatoria }: AuthSelectorProps) {
  const [modo, setModo] = useState('invitado')
  const nombre = contact.nombre
  const tel = contact.tel
  const correo = contact.correo
  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) } })

  const renderBotones = (accion: (sena: boolean) => void) => (
    <div className="space-y-3 mt-6">
      {montoSena > 0 && (
        <button onClick={() => accion(true)} disabled={loading} className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-sm text-black hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: colorP }}>
          <span className="flex flex-col">
            <span>Abonar Seña (${montoSena})</span>
            <span className="text-[10px] font-bold opacity-70 mt-1">Con MercadoPago</span>
          </span>
        </button>
      )}
      {!obligatoria && <button onClick={() => accion(false)} disabled={loading} className="w-full py-5 rounded-[2.5rem] font-black uppercase italic text-xs bg-transparent border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all">
        {loading ? 'PROCESANDO...' : 'RESERVAR Y PAGAR EN LOCAL'}
      </button>}
    </div>
  )

  return (
    <div className="space-y-6">
      {!user && <div className="booking-method flex p-1.5 rounded-2xl border border-white/5">
        <button aria-pressed={modo === 'invitado'} onClick={() => setModo('invitado')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'invitado' ? 'font-bold' : 'text-slate-600'}`}>Invitado</button>
        <button aria-pressed={modo === 'google'} onClick={() => setModo('google')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'google' ? 'font-bold' : 'text-slate-600'}`}>Google</button>
      </div>}
      {!user && modo === 'google' ? <button onClick={login} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[2rem] hover:scale-105 transition-all">Ingresar con Google</button> : (
        <div className="space-y-4">
          <label className="block text-sm">Nombre<input autoComplete="name" type="text" placeholder="TU NOMBRE (EJ: JUAN PEREZ)" value={nombre} onChange={e => setContact({ ...contact, nombre: e.target.value })} required className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" /></label>
          <label className="block text-sm">WhatsApp<input autoComplete="tel" type="tel" placeholder="WHATSAPP (EJ: 1123456789)" value={tel} onChange={e => setContact({ ...contact, tel: e.target.value })} required className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" /></label>
          <label className="block text-sm">Correo electrónico<input autoComplete="email" type="email" placeholder="TU EMAIL (PARA RECIBIR EL TICKET)" value={correo} onChange={e => setContact({ ...contact, correo: e.target.value })} required className="w-full bg-black/50 border border-emerald-500/30 p-5 rounded-[1.5rem] text-[11px] font-black uppercase outline-none focus:border-emerald-500/50" /></label>
          {renderBotones((s) => onConfirm(nombre, tel, s, correo))}
        </div>
      )}
    </div>
  )
}
