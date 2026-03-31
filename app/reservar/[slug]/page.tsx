'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

const BA_TZ = 'America/Argentina/Buenos_Aires'

// Fecha YYYY-MM-DD en timezone Buenos Aires
function toBaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date)
}

// Minutos desde medianoche en BA (para comparar horarios)
function getBaMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BA_TZ, hour: 'numeric', minute: 'numeric', hour12: false
  }).formatToParts(new Date())
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

// Día de la semana (0=Domingo) desde un YYYY-MM-DD en zona BA
function getDayOfWeek(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00-03:00`).getDay()
}

// 7 días a partir de hoy en timezone BA
function generateDias() {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    const iso = toBaDateStr(d)
    const weekday = new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, weekday: 'short' }).format(d)
    const day = new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, day: 'numeric' }).format(d)
    return { iso, weekday, day }
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
    const { data } = await supabase.from('turno')
      .select('*, servicio(nombre, precio)')
      .eq('cliente_id', uid)
      .order('fecha', { ascending: false })
      .limit(5)
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

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    async function check() {
      const { data } = await supabase.from('turno')
        .select('hora')
        .eq('staff_id', sel.barbero.id)
        .eq('fecha', sel.fecha)
        .not('estado', 'eq', 'cancelado')
      setOcupados((data ?? []).map((t: any) => t.hora.slice(0, 5)))
    }
    check()
  }, [sel.barbero, sel.fecha])

  const horas = useMemo(() => {
    if (!negocio || !sel.servicio || !sel.fecha) return []
    const list: string[] = []
    let curr = negocio.hora_apertura || '09:00:00'
    const cierre = negocio.hora_cierre || '18:00:00'

    const hoyStr = toBaDateStr(new Date())
    const esHoy = sel.fecha === hoyStr
    const minLimite = esHoy ? getBaMinutes() + 15 : 0

    while (curr < cierre) {
      const hF = curr.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      const minActual = hh * 60 + mm

      if (!ocupados.includes(hF) && (!esHoy || minActual >= minLimite)) {
        list.push(hF)
      }

      let [h, m] = curr.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      curr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    }
    return list
  }, [negocio, sel.servicio, sel.fecha, ocupados])

  const handleFinal = async (nombre: string, tel: string) => {
    setConfirmando(true)
    const cliNombre = user ? (user.user_metadata?.full_name || user.email) : `${nombre} · ${tel}`
    const { error } = await supabase.from('turno').insert({
      negocio_id: negocio.id,
      servicio_id: sel.servicio.id,
      staff_id: sel.barbero.id,
      fecha: sel.fecha,
      hora: sel.hora + ':00',
      cliente_id: user?.id || null,
      cliente_nombre: cliNombre,
      estado: 'pendiente'
    })
    if (!error) setExito(true)
    setConfirmando(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="font-black italic uppercase text-2xl text-white animate-pulse">CARGANDO...</div>
    </div>
  )

  if (!negocio) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
      <p className="font-black uppercase italic text-slate-500">Negocio no encontrado</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20">
      <div className="max-w-md mx-auto px-6">

        {/* Header Elite */}
        <header className="py-8 flex items-center justify-between border-b border-white/5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border border-white/10"
              style={{ background: colorP + '20', color: colorP }}>
              {negocio.nombre[0]}
            </div>
            <div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter" style={{ color: colorP }}>
                {negocio.nombre}
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reserva online</p>
            </div>
          </div>
          {user && (
            <button onClick={() => setVerPerfil(!verPerfil)}
              className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-white/5 flex-shrink-0 active:scale-95 transition-transform">
              <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}`} alt="P" className="w-full h-full object-cover" />
            </button>
          )}
        </header>

        {/* Panel perfil Luxury */}
        {verPerfil && user && (
          <div className="bg-white/4 border border-white/8 rounded-[2.5rem] p-8 mb-8 animate-in zoom-in-95 duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Mis Turnos</p>
            <div className="space-y-3 mb-8">
              {misTurnos.length === 0
                ? <p className="text-[10px] text-slate-600 italic">Sin turnos recientes.</p>
                : misTurnos.map(t => (
                  <div key={t.id} className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-xs font-black uppercase italic">{t.servicio?.nombre}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">{t.fecha} · {t.hora?.slice(0, 5)} HS</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-white/5 text-slate-400">{t.estado}</span>
                  </div>
                ))
              }
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
              className="w-full py-4 rounded-2xl border border-red-500/30 text-red-400 text-[10px] font-black uppercase hover:bg-red-500/10 transition-colors">
              Cerrar Sesión
            </button>
          </div>
        )}

        {/* Pantalla de Éxito Luxury */}
        {exito ? (
          <div className="pt-20 text-center animate-in zoom-in-95">
            <div className="w-24 h-24 rounded-full border-4 mx-auto mb-8 flex items-center justify-center text-4xl"
              style={{ borderColor: colorP, color: colorP, boxShadow: `0 0 60px ${colorP}30` }}>
              ✓
            </div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">¡Confirmado!</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
              {sel.fecha} a las {sel.hora} HS
            </p>
            <p className="text-slate-600 text-[10px] uppercase font-bold mb-10">con {sel.barbero?.nombre}</p>
            <button onClick={() => window.location.reload()}
              className="font-black uppercase italic px-10 py-5 rounded-2xl text-black transition-all hover:opacity-90 active:scale-95 shadow-xl"
              style={{ backgroundColor: colorP }}>
              Aceptar
            </button>
          </div>

        /* PASO 1 — Servicios Luxury Cards */
        ) : paso === 1 ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Seleccioná Servicio</p>
            <div className="space-y-3">
              {servicios.map(s => (
                <div key={s.id}
                  onClick={() => { setSel({ ...sel, servicio: s }); setPaso(2) }}
                  className="bg-white/4 border border-white/8 hover:border-white/20 p-8 rounded-[2.5rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.97] group">
                  <div>
                    <p className="font-black italic uppercase text-2xl mb-1 transition-all"
                      style={{ color: colorP }}>
                      {s.nombre}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{s.duracion} MIN</p>
                  </div>
                  <p className="text-3xl font-black italic">${s.precio.toLocaleString('es-AR')}</p>
                </div>
              ))}
            </div>
          </div>

        /* PASO 2 — Selección de Turno (Staff, Fecha, Hora) */
        ) : paso === 2 ? (
          <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            <button onClick={() => { setPaso(1); setSel({ ...sel, barbero: null, fecha: '', hora: '' }) }}
              className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors">
              ← Volver
            </button>

            {/* Staff Selector */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Profesional</p>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => {
                  const activo = sel.barbero?.id === st.id
                  return (
                    <div key={st.id} onClick={() => setSel({ ...sel, barbero: st, fecha: '', hora: '' })}
                      className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border cursor-pointer transition-all text-center ${
                        activo ? 'border-transparent' : 'bg-white/4 border-white/8 hover:border-white/20'
                      }`}
                      style={activo ? { backgroundColor: colorP } : {}}>
                      <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-2xl ${
                        activo ? 'bg-black/20 text-white' : 'bg-white/10 text-white'
                      }`}>{st.nombre[0]}</div>
                      <p className={`text-[10px] font-black uppercase truncate ${activo ? 'text-black' : 'text-slate-400'}`}>{st.nombre}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Fecha Selector Luxury */}
            {sel.barbero && (
              <div className="animate-in fade-in duration-700">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Fecha</p>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {dias.map(({ iso, weekday, day }) => {
                    const esLaboral = diasLaborales.includes(getDayOfWeek(iso))
                    const activo = sel.fecha === iso
                    return (
                      <div key={iso}
                        onClick={() => esLaboral && setSel({ ...sel, fecha: iso, hora: '' })}
                        className={`flex-shrink-0 w-16 h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                          !esLaboral
                            ? 'opacity-20 cursor-not-allowed bg-white/2 border-white/5'
                            : activo
                              ? 'border-transparent cursor-pointer'
                              : 'bg-white/4 border-white/8 hover:border-white/20 cursor-pointer'
                        }`}
                        style={activo && esLaboral ? { backgroundColor: colorP } : {}}>
                        <p className={`text-[9px] font-black uppercase mb-1 tracking-tighter ${activo ? 'text-black' : 'text-slate-600'}`}>{weekday}</p>
                        <p className={`text-2xl font-black ${activo ? 'text-black' : ''}`}>{day}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Horarios Grid Elite */}
            {sel.fecha && (
              <div className="animate-in fade-in duration-700">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Horarios Disponibles</p>
                {horas.length === 0
                  ? (
                    <div className="text-center py-10 bg-white/3 rounded-[2rem] border border-dashed border-white/10">
                      <p className="text-slate-600 text-xs font-black uppercase italic tracking-widest">Cerrado o sin cupos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {horas.map(h => {
                        const activo = sel.hora === h
                        return (
                          <div key={h} onClick={() => setSel({ ...sel, hora: h })}
                            className={`py-5 rounded-2xl text-[11px] font-black text-center cursor-pointer transition-all border ${
                              activo ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/8 hover:border-white/20'
                            }`}
                            style={activo ? { backgroundColor: colorP, color: 'black' } : {}}>
                            {h}
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            )}

            {sel.hora && (
              <button onClick={() => setPaso(3)}
                className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-xl text-black transition-all hover:opacity-90 active:scale-95 shadow-2xl"
                style={{ backgroundColor: colorP }}>
                Continuar →
              </button>
            )}
          </div>

        /* PASO 3 — Resumen & Auth Elite */
        ) : (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white transition-colors">
              ← Volver
            </button>
            <div className="bg-white/4 border border-white/8 rounded-[3.5rem] p-10 backdrop-blur-md">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-10 text-center">Resumen del turno</p>
              <div className="text-center mb-12 space-y-3">
                <p className="text-4xl font-black italic uppercase leading-none" style={{ color: colorP }}>
                  {sel.servicio?.nombre}
                </p>
                <div className="pt-2">
                  <p className="font-black uppercase text-xs tracking-[0.2em] text-white">
                    {sel.fecha} · {sel.hora} HS
                  </p>
                  <p className="font-black uppercase text-[10px] text-slate-500 mt-1">
                    PROFESIONAL: {sel.barbero?.nombre}
                  </p>
                </div>
                <p className="text-4xl font-black pt-4">${sel.servicio?.precio?.toLocaleString('es-AR')}</p>
              </div>
              <AuthSelector user={user} colorP={colorP} loading={confirmando} onConfirm={handleFinal} slug={slug} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthSelector({ user, colorP, loading, onConfirm, slug }: any) {
  const [modo, setModo] = useState('invitado')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')

  const login = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) }
  })

  if (user) return (
    <button onClick={() => onConfirm()} disabled={loading}
      className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-lg text-black transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
      style={{ backgroundColor: colorP }}>
      {loading ? 'RESERVANDO...' : 'RESERVAR AHORA'}
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
        <button onClick={() => setModo('invitado')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${modo === 'invitado' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600'}`}>
          Invitado
        </button>
        <button onClick={() => setModo('google')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${modo === 'google' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600'}`}>
          Google
        </button>
      </div>

      {modo === 'google' ? (
        <button onClick={login}
          className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[1.75rem] hover:bg-emerald-400 transition-colors shadow-lg active:scale-95">
          Ingresar con Google
        </button>
      ) : (
        <div className="space-y-4">
          <input type="text" placeholder="TU NOMBRE" value={nombre} onChange={e => setNombre(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-[11px] font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
          <input type="tel" placeholder="WHATSAPP (OPCIONAL)" value={tel} onChange={e => setTel(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-[11px] font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
          <button onClick={() => onConfirm(nombre, tel)} disabled={loading || !nombre.trim()}
            className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-lg text-black transition-all hover:opacity-90 disabled:opacity-50 active:scale-95 shadow-xl"
            style={{ backgroundColor: colorP }}>
            {loading ? 'RESERVANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      )}
    </div>
  )
}
