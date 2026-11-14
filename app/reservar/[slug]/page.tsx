'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import Image from 'next/image'
import { getAppearance } from '@/lib/personalization.mjs'

type NegocioPublico = {
  id: string; nombre: string; descripcion: string | null; logo_url: string | null
  tema: string | null; dias_laborales: number[] | null
  rubro: string | null; estilo_visual: string | null; modo_visual: string | null
  banner_url: string | null; mensaje_bienvenida: string | null
}
type ServicioPublico = {
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
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [sel, setSel] = useState<Seleccion>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [exito, setExito] = useState(false)
  const [gestionUrl, setGestionUrl] = useState('')
  const [user, setUser] = useState<User | null>(null)

  const colorP = getThemeColor(negocio?.tema)
  const appearance = getAppearance({
    businessType: negocio?.rubro,
    visualStyle: negocio?.estilo_visual,
    visualMode: negocio?.modo_visual,
  })
  const cardStyle = { background: appearance.surface, borderColor: appearance.border, borderRadius: appearance.radius }
  const dias = useMemo(() => generateDias(), [])
  const diasLaborales: number[] = negocio?.dias_laborales ?? [1, 2, 3, 4, 5, 6]

  useEffect(() => {
    async function init() {
      const response = await fetch(`/api/public/negocios/${encodeURIComponent(String(slug))}`, { cache: 'no-store' })
      if (!response.ok) return setLoading(false)
      const data = await response.json()
      setNegocio(data.negocio)
      setServicios(data.servicios ?? [])
      setStaffList(data.staff ?? [])
      setLoading(false)
    }
    void init()
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => setUser(currentUser))
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
  const montoSenaCalculado = useMemo(() => {
    if (!sel.servicio) return 0
    if (sel.servicio.seña_tipo === 'ninguno' || sel.servicio.precio <= 0) return 0
    if (sel.servicio.seña_tipo === 'fijo') return Number(sel.servicio.seña_valor) || 0
    // Porcentaje
    const porcentaje = Number(sel.servicio.seña_valor) || 50
    return Math.round(sel.servicio.precio * (porcentaje / 100))
  }, [sel.servicio])

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
    const response = await fetch('/api/public/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        negocioId,
        servicioId,
        staffId,
        fecha: sel.fecha,
        hora: sel.hora,
        nombre,
        telefono: tel,
        email: correoInvitado,
      }),
    })
    const booking = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(booking.error ?? 'No se pudo reservar')
      setConfirmando(false)
      if (response.status === 409) setHorariosReintento((n) => n + 1)
      return
    }
    void fetch('/api/notificar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ turnoId: booking.id, manageToken: booking.manageToken }),
    })

    // 3. Pagar Seña Exacta a MercadoPago
    if (pagarSena && montoSenaCalculado > 0) {
      const res = await fetch('/api/sena', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turno_id: booking.id, manage_token: booking.manageToken })
      })
      const resData = await res.json()
      if (resData.url) { window.location.href = resData.url; return } 
    }

    setGestionUrl(`/cancelar/${booking.id}?token=${booking.manageToken}`)
    setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">CARGANDO...</div>
  if (!negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-slate-500">NEGOCIO NO ENCONTRADO</div>

  return (
    <div className="min-h-screen pb-20 transition-colors" style={{ background: appearance.background, color: appearance.foreground }}>
      <div className="max-w-md mx-auto px-6">
        {negocio.banner_url && <Image src={negocio.banner_url} alt={`Bienvenida a ${negocio.nombre}`} width={800} height={300} unoptimized className="mt-6 w-full h-40 object-cover rounded-2xl" />}
        <header className="py-8 flex items-center justify-between border-b mb-8" style={{ borderColor: appearance.border }}>
          <div className="flex items-center gap-4">
            {negocio.logo_url ? <Image src={negocio.logo_url} alt={`Logo de ${negocio.nombre}`} width={56} height={56} unoptimized className="w-14 h-14 rounded-2xl object-cover border border-white/10" /> : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10" style={{ background: colorP + '20', color: colorP }}>{negocio.nombre[0]}</div>}
            <div><h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: colorP, letterSpacing: appearance.tracking }}>{negocio.nombre}</h1><p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1" style={{ color: appearance.muted }}>Reserva online</p></div>
          </div>
        </header>
        {negocio.mensaje_bienvenida && <p className="mb-6 whitespace-pre-wrap">{negocio.mensaje_bienvenida}</p>}
        {user && <a href="/mis-turnos" className="block mb-6 underline">Mis reservas</a>}

        {exito ? (
          <div className="pt-20 text-center animate-in zoom-in-95">
            <div className="w-28 h-28 rounded-full border-4 mx-auto mb-8 flex items-center justify-center text-5xl" style={{ borderColor: colorP, color: colorP, boxShadow: `0 0 80px ${colorP}30` }}>✓</div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">¡Turno Listo!</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-12">{sel.fecha} A LAS {sel.hora} HS</p>
            {gestionUrl && <a href={gestionUrl} className="block text-sm font-bold underline underline-offset-4 mb-8" style={{ color: colorP }}>Guardar enlace para gestionar o cancelar</a>}
            <button onClick={() => window.location.reload()} className="font-black uppercase italic text-lg px-12 py-5 rounded-[2rem] text-black shadow-xl" style={{ backgroundColor: colorP }}>Genial</button>
          </div>
        ) : paso === 1 ? (
          <div className="animate-in fade-in">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Elegí un servicio</p>
            <div className="space-y-4">
              {servicios.map(s => (
                <div key={s.id} onClick={() => { setSel({ servicio: s, barbero: null, fecha: '', hora: '' }); setHoras([]); setPaso(2) }} className="border p-8 flex justify-between items-center cursor-pointer transition-all active:scale-[0.98]" style={cardStyle}>
                  <div><p className="font-black italic uppercase text-2xl mb-1 tracking-tighter" style={{ color: colorP }}>{s.nombre}</p><p className="text-[10px] text-slate-500 font-black uppercase">{s.duracion} MINUTOS</p></div>
                  <p className="text-3xl font-black italic">${s.precio}</p>
                </div>
              ))}
            </div>
          </div>
        ) : paso === 2 ? (
          <div className="space-y-12 animate-in slide-in-from-right-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white">← Volver</button>
            <div className="border px-6 py-4 flex justify-between items-center" style={cardStyle}>
              <div><p className="font-black uppercase text-base italic" style={{ color: colorP }}>{sel.servicio?.nombre}</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{sel.servicio?.duracion} MIN</p></div>
              <p className="font-black text-xl italic">${sel.servicio?.precio}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Profesional</p>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => (
                  <div key={st.id} onClick={() => setSel({ ...sel, barbero: st, fecha: '', hora: '' })} className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border cursor-pointer text-center ${sel.barbero?.id === st.id ? 'border-transparent shadow-xl' : 'bg-white/4 border-white/5'}`} style={sel.barbero?.id === st.id ? { backgroundColor: colorP } : {}}>
                    <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center font-black text-2xl ${sel.barbero?.id === st.id ? 'bg-black/20 text-white' : 'bg-white/10'}`}>{st.nombre[0]}</div>
                    <p className={`text-[10px] font-black uppercase truncate ${sel.barbero?.id === st.id ? 'text-black' : 'text-slate-400'}`}>{st.nombre}</p>
                  </div>
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
                    return <div key={iso} onClick={() => { if (!esLaboral) return; setHorariosCargando(true); setHorariosError(false); setHorariosReintento((n) => n + 1); setSel({ ...sel, fecha: iso, hora: '' }) }} className={`flex-shrink-0 w-16 h-24 rounded-[2rem] border flex flex-col items-center justify-center ${!esLaboral ? 'opacity-20' : activo ? 'border-transparent' : 'bg-white/4 border-white/5'}`} style={activo && esLaboral ? { backgroundColor: colorP } : {}}><p className={`text-[9px] font-black uppercase mb-2 ${activo?'text-black':'text-slate-500'}`}>{weekday}</p><p className={`text-2xl font-black ${activo?'text-black':''}`}>{day}</p></div>
                  })}
                </div>
              </div>
            )}
            {sel.fecha && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Horarios Libres</p>
                {horariosCargando ? <div className="text-center py-10 text-slate-400 text-xs">Verificando disponibilidad...</div> : horariosError ? <div role="alert" className="text-center py-10 text-amber-300 text-xs">No se pudieron verificar los horarios. Volvé a elegir la fecha para reintentar.</div> : horas.length === 0 ? <div className="text-center py-10 bg-white/4 rounded-[3rem] border border-dashed border-white/10"><p className="text-slate-500 text-[10px] font-black uppercase">Sin Cupos</p></div> : (
                  <div className="grid grid-cols-4 gap-3">
                    {horas.map(h => <div key={h} onClick={() => setSel({ ...sel, hora: h })} className={`py-5 rounded-2xl text-[11px] font-black text-center cursor-pointer border ${sel.hora === h ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5'}`} style={sel.hora === h ? { backgroundColor: colorP, color: 'black' } : {}}>{h}</div>)}
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
                <p className="text-4xl font-black italic uppercase leading-none" style={{ color: colorP }}>{sel.servicio?.nombre}</p>
                <p className="font-black uppercase text-xs tracking-[0.3em] text-white pt-2">{sel.fecha} · {sel.hora} HS</p>
                <p className="text-4xl font-black pt-4">${sel.servicio?.precio}</p>
                {montoSenaCalculado > 0 && <p className="text-[10px] font-black uppercase text-emerald-400 pt-2 tracking-widest">Requiere Seña: ${montoSenaCalculado}</p>}
              </div>
              <AuthSelector key={user?.id ?? 'guest'} user={user} colorP={colorP} loading={confirmando} onConfirm={handleFinal} slug={slug} montoSena={montoSenaCalculado} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type AuthSelectorProps = {
  user: User | null
  colorP: string
  loading: boolean
  onConfirm: (nombre: string, telefono: string, pagarSena: boolean, email: string) => Promise<void>
  slug: string
  montoSena: number
}

function AuthSelector({ user, colorP, loading, onConfirm, slug, montoSena }: AuthSelectorProps) {
  const [modo, setModo] = useState('invitado')
  const [nombre, setNombre] = useState(user?.user_metadata?.full_name ?? '')
  const [tel, setTel] = useState('')
  const [correo, setCorreo] = useState(user?.email ?? '')
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
      <button onClick={() => accion(false)} disabled={loading} className="w-full py-5 rounded-[2.5rem] font-black uppercase italic text-xs text-white bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all">
        {loading ? 'PROCESANDO...' : 'RESERVAR Y PAGAR EN LOCAL'}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      {!user && <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5">
        <button onClick={() => setModo('invitado')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'invitado' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Invitado</button>
        <button onClick={() => setModo('google')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'google' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Google</button>
      </div>}
      {!user && modo === 'google' ? <button onClick={login} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[2rem] hover:scale-105 transition-all">Ingresar con Google</button> : (
        <div className="space-y-4">
          <input type="text" placeholder="TU NOMBRE (EJ: JUAN PEREZ)" value={nombre} onChange={e => setNombre(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" />
          <input type="tel" placeholder="WHATSAPP (EJ: 1123456789)" value={tel} onChange={e => setTel(e.target.value)} required className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" />
          <input type="email" placeholder="TU EMAIL (PARA RECIBIR EL TICKET)" value={correo} onChange={e => setCorreo(e.target.value)} required className="w-full bg-black/50 border border-emerald-500/30 p-5 rounded-[1.5rem] text-[11px] font-black uppercase outline-none focus:border-emerald-500/50" />
          {renderBotones((s) => onConfirm(nombre, tel, s, correo))}
        </div>
      )}
    </div>
  )
}
