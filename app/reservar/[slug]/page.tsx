'use client'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { buildWhatsAppConfirmacion, buildWhatsAppNuevoTurno } from '@/lib/whatsapp'

type Bloqueo = {
  hora_inicio: string; hora_fin: string
  recurrente: boolean; dia_semana?: number; fecha?: string
}

type Negocio = {
  id: string; nombre: string; slug: string; tema?: string
  hora_apertura?: string; hora_cierre?: string
  dias_laborales?: number[]; whatsapp?: string
}
type Servicio = { id: string; nombre: string; precio: number; duracion: number }
type Staff    = { id: string; nombre: string; avatar_url?: string | null }
type Turno    = { id: string; fecha: string; hora: string; estado: string; Servicio?: { nombre: string; precio: number } }
type Sel      = { servicio: Servicio | null; barbero: Staff | null; fecha: string; hora: string }

const PASO_LABELS = ['Servicio', 'Turno', 'Confirmar']
const ESTADO_BADGE: Record<string, { bg: string; label: string }> = {
  pendiente:  { bg: 'bg-amber-500',   label: 'Pendiente'  },
  confirmado: { bg: 'bg-emerald-500', label: 'Confirmado' },
  cancelado:  { bg: 'bg-rose-500',    label: 'Cancelado'  },
  completado: { bg: 'bg-slate-500',   label: 'Completado' },
}

export default function ReservaPro() {
  const { slug } = useParams()
  const [negocio,     setNegocio]     = useState<Negocio | null>(null)
  const [servicios,   setServicios]   = useState<Servicio[]>([])
  const [staffList,   setStaffList]   = useState<Staff[]>([])
  const [ocupados,    setOcupados]    = useState<string[]>([])
  const [bloqueos,    setBloqueos]    = useState<Bloqueo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [user,        setUser]        = useState<User | null>(null)
  const [misTurnos,   setMisTurnos]   = useState<Turno[]>([])
  const [paso,        setPaso]        = useState(1)
  const [sel,         setSel]         = useState<Sel>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [turnoId,     setTurnoId]     = useState<string | null>(null)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [verPerfil,   setVerPerfil]   = useState(false)

  // Cargar negocio
  useEffect(() => {
    async function init() {
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (!neg) { setLoading(false); return }
      setNegocio(neg)
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', neg.id),
        supabase.from('Staff').select('*').eq('negocio_id', neg.id).eq('activo', true),
      ])
      setServicios(svcs ?? [])
      setStaffList(stf ?? [])
      setLoading(false)
    }
    init()
  }, [slug])

  // Auth
  const cargarMisTurnos = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('Turno')
      .select('id, fecha, hora, estado, Servicio(nombre, precio)')
      .eq('cliente_id', userId)
      .order('fecha', { ascending: false })
      .limit(8)
    setMisTurnos((data as unknown as Turno[]) ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); cargarMisTurnos(session.user.id) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); cargarMisTurnos(session.user.id) }
      else { setUser(null); setMisTurnos([]) }
    })
    return () => listener.subscription.unsubscribe()
  }, [cargarMisTurnos])

  // Horarios ocupados
  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    supabase.from('Turno').select('hora')
      .eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      .then(({ data }) => setOcupados((data ?? []).map((t: { hora: string }) => t.hora.slice(0, 5))))
  }, [sel.barbero, sel.fecha])

  // Métricas
  const metricas = useMemo(() => {
    if (!misTurnos.length) return null
    const completados = misTurnos.filter(t => t.estado === 'completado')
    const proximos = misTurnos.filter(t =>
      ['pendiente', 'confirmado'].includes(t.estado) &&
      t.fecha >= new Date().toISOString().split('T')[0]
    )
    const frecuencia: Record<string, number> = {}
    completados.forEach(t => { const n = t.Servicio?.nombre ?? '?'; frecuencia[n] = (frecuencia[n] ?? 0) + 1 })
    const favorito = Object.entries(frecuencia).sort((a, b) => b[1] - a[1])[0]?.[0]
    return {
      totalVisitas: completados.length,
      proximoTurno: proximos[0] ?? null,
      favorito,
      totalGastado: completados.reduce((s, t) => s + (t.Servicio?.precio ?? 0), 0),
    }
  }, [misTurnos])

  const colorP = getThemeColor(negocio?.tema)
  const progress = ({ 1: 33, 2: 66, 3: 100, 4: 100 } as Record<number, number>)[paso] ?? 0

  const generarHoras = (): string[] => {
    if (!negocio?.hora_apertura || !negocio?.hora_cierre || !sel.servicio) return []
    const lista: string[] = []
    let act = negocio.hora_apertura

    // Calcular si la fecha seleccionada es hoy en Argentina (UTC-3 fijo)
    // Usamos el input[type=date] del selector que ya tiene YYYY-MM-DD en hora local
    const msAR = Date.now() + (-3 * 60 * 60 * 1000)
    const hoyAR = new Date(msAR)
    const hoyStr = hoyAR.getUTCFullYear() + '-' + String(hoyAR.getUTCMonth() + 1).padStart(2, '0') + '-' + String(hoyAR.getUTCDate()).padStart(2, '0')
    const esHoy = sel.fecha === hoyStr

    // Minutos actuales en Argentina
    const minutosAhora = hoyAR.getUTCHours() * 60 + hoyAR.getUTCMinutes() + 15

    while (act < negocio.hora_cierre) {
      const hF = act.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      const minHora = hh * 60 + mm
      const yaPaso = esHoy && minHora <= minutosAhora

      // Verificar bloqueos de horario
      const fechaSelDate = new Date(sel.fecha + 'T12:00:00')
      const diaSemanaSelec = fechaSelDate.getDay()
      const bloqueado = bloqueos.some(b => {
        const hIni = b.hora_inicio.slice(0,5)
        const hFin = b.hora_fin.slice(0,5)
        const enRango = hF >= hIni && hF < hFin
        if (!enRango) return false
        if (b.recurrente) return b.dia_semana === diaSemanaSelec
        return b.fecha === sel.fecha
      })

      if (!ocupados.includes(hF) && !yaPaso && !bloqueado) lista.push(hF)
      let [h, m] = act.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      act = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00'
    }
    return lista
  }

  const etiquetaDia = (date: Date) => {
    const dia = date.toLocaleDateString('es-ES', { weekday: 'short' })
    return dia.charAt(0).toUpperCase() + dia.slice(1) + ' ' + date.getDate()
  }

  const loginGoogle = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) },
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [guestNombre, setGuestNombre] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [guestTel, setGuestTel] = useState('')

  const confirmarTurnoGuest = async (gNombre?: string, gTel?: string) => {
    const nombreFinal = (gNombre ?? guestNombre ?? '').trim()
    const telFinal = (gTel ?? guestTel ?? '').trim()
    if (!negocio || !sel.servicio || !sel.barbero || !nombreFinal) return
    setConfirmando(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.from('Turno').insert({
        negocio_id: negocio.id,
        servicio_id: sel.servicio.id,
        staff_id: sel.barbero.id,
        fecha: sel.fecha,
        hora: sel.hora + ':00',
        cliente_id: null,
        cliente_nombre: nombreFinal + (telFinal ? ' · ' + telFinal : ''),
        estado: 'pendiente',
        pago_estado: 'pendiente',
      }).select('id').single()
      if (error || !data) throw new Error(error?.message ?? 'Error')
      setTurnoId(data.id)
      // Guardar link WA del dueño para mostrarlo en paso 6 (no abrir automáticamente)
      if (negocio.whatsapp) {
        const waDueno = buildWhatsAppNuevoTurno({
          telefono: negocio.whatsapp,
          clienteNombre: user?.email ?? 'Cliente',
          servicio: sel.servicio!.nombre,
          barbero: sel.barbero!.nombre,
          fecha: sel.fecha,
          hora: sel.hora,
          negocioNombre: negocio.nombre,
        })
        sessionStorage.setItem('turnly_wa_dueno_' + data.id, waDueno)
      }

      if (negocio.whatsapp) {
        const waUrl = buildWhatsAppConfirmacion({
          telefono: negocio.whatsapp,
          clienteNombre: nombreFinal,
          servicio: sel.servicio.nombre,
          barbero: sel.barbero.nombre,
          fecha: sel.fecha,
          hora: sel.hora,
          negocioNombre: negocio.nombre,
        })
        sessionStorage.setItem('turnly_wa_' + data.id, waUrl)
      }
      setPaso(4)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setConfirmando(false)
    }
  }

  const confirmarTurno = async () => {
    // Verificar blacklist
    if (user) {
      const { data: nota } = await supabase.from('ClienteNota')
        .select('bloqueado').eq('negocio_id', negocio!.id).eq('cliente_id', user.id).single()
      if (nota?.bloqueado) {
        setErrorMsg('No podés reservar en este negocio. Contactá al local para más información.')
        return
      }
    }
    // Nombre completo obligatorio siempre
    const nombreCompleto = (user?.user_metadata?.full_name ?? '').trim()
    if (!nombreCompleto || nombreCompleto.split(' ').filter(Boolean).length < 2) {
      setErrorMsg('Por favor ingresá tu nombre y apellido completo para reservar.')
      return
    }
    if (!user || !negocio || !sel.servicio || !sel.barbero) return
    setConfirmando(true)
    setErrorMsg(null)
    try {
      const { data, error } = await supabase.from('Turno').insert({
        negocio_id: negocio.id,
        servicio_id: sel.servicio.id,
        staff_id: sel.barbero.id,
        fecha: sel.fecha,
        hora: sel.hora + ':00',
        cliente_id: user.id,
        cliente_nombre: user.user_metadata?.full_name ?? user.email,
        estado: 'pendiente',
        pago_estado: 'pendiente',
      }).select('id').single()

      if (error || !data) throw new Error(error?.message ?? 'Error creando turno')

      setTurnoId(data.id)

      // Guardar link de WhatsApp para mostrar en éxito
      // Guardar link WA del dueño para mostrarlo en paso 6 (no abrir automáticamente)
      if (negocio.whatsapp) {
        const waDueno = buildWhatsAppNuevoTurno({
          telefono: negocio.whatsapp,
          clienteNombre: user?.email ?? 'Cliente',
          servicio: sel.servicio!.nombre,
          barbero: sel.barbero!.nombre,
          fecha: sel.fecha,
          hora: sel.hora,
          negocioNombre: negocio.nombre,
        })
        sessionStorage.setItem('turnly_wa_dueno_' + data.id, waDueno)
      }

      if (negocio.whatsapp) {
        const waUrl = buildWhatsAppConfirmacion({
          telefono: negocio.whatsapp,
          clienteNombre: user.user_metadata?.full_name ?? 'Cliente',
          servicio: sel.servicio.nombre,
          barbero: sel.barbero.nombre,
          fecha: sel.fecha,
          hora: sel.hora,
          negocioNombre: negocio.nombre,
        })
        sessionStorage.setItem('turnly_wa_' + data.id, waUrl)
      }

      // Notificar al dueño automáticamente
      if (negocio.whatsapp) {
        const waDueno = buildWhatsAppNuevoTurno({
          telefono: negocio.whatsapp,
          clienteNombre: user.user_metadata?.full_name ?? 'Cliente',
          servicio: sel.servicio!.nombre,
          barbero: sel.barbero!.nombre,
          fecha: sel.fecha,
          hora: sel.hora,
          negocioNombre: negocio.nombre,
        })
        window.open(waDueno, '_blank')
      }
      setPaso(4)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error creando turno')
    } finally {
      setConfirmando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <span className="font-black italic uppercase animate-pulse" style={{ color: getThemeColor() }}>
        Cargando...
      </span>
    </div>
  )
  if (!negocio) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-500 font-bold">
      Negocio no encontrado.
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      <div className="max-w-md mx-auto px-5 pb-16">

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base border border-white/10"
                style={{ background: colorP + '18', color: colorP }}>
                {negocio.nombre.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black italic" style={{ color: colorP }}>{negocio.nombre}</p>
                <p className="text-[10px] text-slate-500">Reserva online</p>
              </div>
            </div>
            {user ? (
              <button onClick={() => setVerPerfil(true)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1 bg-white/5 hover:bg-white/10 transition">
                {user.user_metadata?.avatar_url ? (
                  <Image src={user.user_metadata.avatar_url} alt="av" width={24} height={24} unoptimized
                    className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black"
                    style={{ color: colorP }}>
                    {(user.user_metadata?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Mis turnos</span>
              </button>
            ) : (
              <button onClick={loginGoogle}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase bg-white/5 hover:bg-white/15 transition">
                Entrar
              </button>
            )}
          </div>

          {paso < 6 && (
            <>
              <div className="mt-3 h-0.5 w-full rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: progress + '%', background: 'linear-gradient(90deg,' + colorP + ',' + colorP + '99)' }} />
              </div>
              <div className="flex gap-1 mt-2">
                {PASO_LABELS.map((label, i) => (
                  <span key={label} className="text-[9px] font-black uppercase tracking-widest transition-colors"
                    style={{ color: i + 1 === paso ? colorP : i + 1 < paso ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
                    {label}{i < 4 && <span className="mx-1 opacity-30">·</span>}
                  </span>
                ))}
              </div>
            </>
          )}
        </header>

        {/* MODAL PERFIL */}
        {verPerfil && user && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75">
            <div className="w-full max-w-md bg-[#020617] border border-white/10 border-b-0 rounded-t-[2.5rem] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {user.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="av" width={40} height={40} unoptimized
                      className="w-10 h-10 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black"
                      style={{ color: colorP }}>
                      {(user.user_metadata?.full_name ?? user.email ?? 'U')[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-sm">{user.user_metadata?.full_name ?? 'Mi perfil'}</p>
                    <p className="text-slate-500 text-[10px]">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => setVerPerfil(false)} className="text-slate-500 hover:text-white text-xs font-black">X</button>
              </div>

              {metricas && (
                <div className="grid grid-cols-3 gap-2 mb-5">
                  <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                    <p className="font-black italic text-2xl" style={{ color: colorP }}>{metricas.totalVisitas}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">Visitas</p>
                  </div>
                  <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                    <p className="font-black italic text-xl" style={{ color: colorP }}>${metricas.totalGastado.toLocaleString('es-AR')}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">Gastado</p>
                  </div>
                  <div className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center overflow-hidden">
                    <p className="font-black text-xs truncate" style={{ color: colorP }}>{metricas.favorito ?? '-'}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">Favorito</p>
                  </div>
                </div>
              )}

              {metricas?.proximoTurno && (
                <div className="rounded-2xl p-4 mb-4 border"
                  style={{ background: colorP + '10', borderColor: colorP + '30' }}>
                  <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: colorP }}>Proximo turno</p>
                  <p className="font-black">{metricas.proximoTurno.Servicio?.nombre ?? 'Servicio'}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {metricas.proximoTurno.fecha} a las {metricas.proximoTurno.hora.slice(0, 5)} hs
                  </p>
                  {metricas.proximoTurno.estado === 'pendiente' && (
                    <button
                      onClick={async () => {
                        if (!confirm('¿Cancelar este turno?')) return
                        await supabase.from('Turno').update({ estado: 'cancelado' }).eq('id', metricas.proximoTurno!.id)
                        if (user) cargarMisTurnos(user.id)
                      }}
                      className="mt-3 w-full py-2 rounded-xl text-[10px] font-black uppercase text-red-400 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                      Cancelar turno
                    </button>
                  )}
                </div>
              )}

              <p className="text-[9px] font-black uppercase text-slate-500 mb-3 tracking-widest">Historial</p>
              <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 pb-4">
                {misTurnos.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-4">Aun no tenes turnos.</p>
                ) : misTurnos.map(t => {
                  const badge = ESTADO_BADGE[t.estado] ?? { bg: 'bg-slate-500', label: t.estado }
                  return (
                    <div key={t.id}
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-black">{t.Servicio?.nombre ?? '-'}</p>
                        <p className="text-[10px] text-slate-500">{t.fecha} · {t.hora.slice(0, 5)} hs</p>
                      </div>
                      <span className={badge.bg + ' text-[9px] font-black uppercase px-2 py-1 rounded-full text-black'}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => { supabase.auth.signOut(); setVerPerfil(false) }}
                className="mt-4 w-full text-[10px] text-slate-600 hover:text-red-400 font-black uppercase transition-colors">
                Cerrar sesion
              </button>
            </div>
          </div>
        )}

        {/* PASO 1: SERVICIO */}
        {paso === 1 && (
          <section className="pt-8 space-y-3">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">Que servicio queres?</h2>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({ ...sel, servicio: s }); setPaso(2) }}
                className="w-full bg-white/4 border border-white/8 hover:border-white/20 p-5 rounded-[1.75rem] flex justify-between items-center transition-all active:scale-[0.98]">
                <div className="text-left">
                  <h3 className="font-black italic uppercase text-lg">{s.nombre}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">{s.duracion} min</p>
                </div>
                <span className="font-black italic text-xl" style={{ color: colorP }}>${s.precio.toLocaleString('es-AR')}</span>
              </button>
            ))}
          </section>
        )}

        {/* PASO 2: BARBERO + DIA + HORA (TODO JUNTO) */}
        {paso === 2 && (
          <section className="pt-8 space-y-6">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">Volver</button>

            {/* Sección 1: Elegir Barbero */}
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">1. Con quién?</h2>
              <div className="grid grid-cols-2 gap-3">
                {staffList.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSel({ ...sel, barbero: p })}
                    className={`bg-white/4 border p-5 rounded-[1.5rem] text-center active:scale-[0.97] transition-all ${
                      sel.barbero?.id === p.id
                        ? 'border-white/40 shadow-lg'
                        : 'border-white/8 hover:border-white/20'
                    }`}
                  >
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.nombre} width={40} height={40} unoptimized
                        className="w-10 h-10 rounded-full mx-auto mb-2 object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-black text-lg border border-white/10"
                        style={{ background: colorP + '18', color: colorP }}>
                        {p.nombre[0]}
                      </div>
                    )}
                    <h3 className="font-black italic uppercase text-[10px]">{p.nombre}</h3>
                  </button>
                ))}
              </div>
            </div>

            {/* Sección 2: Elegir Día - solo visible si hay barbero seleccionado */}
            {sel.barbero && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">2. Qué día?</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                    const d = new Date(); d.setDate(d.getDate() + offset)
                    const iso = d.toISOString().split('T')[0]
                    const lab = negocio.dias_laborales?.includes(new Date(iso + 'T12:00:00').getDay())
                    const estaSeleccionado = sel.fecha === iso

                    return (
                      <button
                        key={iso}
                        disabled={!lab}
                        onClick={() => { setSel({ ...sel, fecha: iso }); setSel(prev => ({ ...prev, hora: '' })) }}
                        className={`flex-shrink-0 w-20 h-20 rounded-2xl border font-black transition-all ${
                          !lab
                            ? 'opacity-20 cursor-not-allowed border-transparent bg-white/4'
                            : estaSeleccionado
                              ? 'border-white/40 shadow-lg text-black'
                              : 'border-white/8 hover:border-white/20 bg-white/4 text-white'
                        }`}
                        style={estaSeleccionado ? { backgroundColor: colorP } : {}}
                      >
                        <div className="text-[9px] uppercase tracking-tighter">{etiquetaDia(d).slice(0, 3)}</div>
                        <div className="text-xl">{d.getDate()}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Sección 3: Elegir Hora - solo visible si hay día seleccionado */}
            {sel.barbero && sel.fecha && (
              <div className="animate-in fade-in slide-in-from-top-4">
                <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">3. A qué hora?</h2>
                {generarHoras().length === 0 ? (
                  <p className="text-center text-slate-500 font-bold py-8 italic">No hay horarios disponibles.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {generarHoras().map(h => (
                      <button
                        key={h}
                        onClick={() => setSel({ ...sel, hora: h })}
                        className={`py-3 rounded-xl font-black text-[10px] border transition-all active:scale-[0.97] ${
                          sel.hora === h
                            ? 'text-black border-transparent shadow-lg'
                            : 'bg-white/4 border-white/8 hover:border-white/20 text-white'
                        }`}
                        style={sel.hora === h ? { backgroundColor: colorP } : {}}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botón continuar - solo visible si todo está seleccionado */}
            {sel.barbero && sel.fecha && sel.hora && (
              <button
                onClick={() => setPaso(3)}
                className="w-full py-5 rounded-[1.75rem] font-black italic text-lg text-black transition-all hover:opacity-90 shadow-lg"
                style={{ backgroundColor: colorP }}
              >
                Continuar
              </button>
            )}
          </section>
        )}

        {/* PASO 3: CONFIRMAR */}
        {paso === 3 && (
          <section className="pt-8 space-y-5">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">Volver</button>
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Confirma tu turno</h2>

            <div className="bg-white/4 border border-white/8 rounded-[2rem] p-5 space-y-3">
              {([['Servicio', sel.servicio?.nombre ?? ''], ['Barbero', sel.barbero?.nombre ?? ''], ['Fecha', sel.fecha], ['Hora', sel.hora + ' hs']] as [string, string][]).map(([l, v]) => (
                <div key={l} className="flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{l}</span>
                  <span className="font-bold text-sm">{v}</span>
                </div>
              ))}
              <div className="border-t border-white/8 pt-3 flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Precio</span>
                <span className="font-black italic text-2xl" style={{ color: colorP }}>
                  ${sel.servicio?.precio.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm font-bold">
                {errorMsg}
              </p>
            )}

            <ConfirmarOGuest
              user={user}
              colorP={colorP}
              confirmando={confirmando}
              errorMsg={errorMsg}
              onConfirmar={confirmarTurno}
              onConfirmarGuest={confirmarTurnoGuest}
              onLoginGoogle={loginGoogle}
            />
          </section>
        )}

        {/* PASO 4: EXITO */}
        {paso === 4 && (
          <section className="pt-16 text-center space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl text-black font-black"
              style={{ backgroundColor: colorP, boxShadow: '0 0 60px ' + colorP + '40' }}>
              OK
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Turno Confirmado!</h2>
              <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">
                Nos vemos pronto en {negocio.nombre}
              </p>
            </div>

            {negocio.whatsapp && turnoId && (() => {
              const waUrl = typeof window !== 'undefined'
                ? sessionStorage.getItem('turnly_wa_' + turnoId)
                : null
              return waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl font-black italic text-sm text-black hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#25D366' }}>
                  <WAIcon />
                  Ver en WhatsApp
                </a>
              ) : null
            })()}

            <button
              onClick={() => { setPaso(1); setSel({ servicio: null, barbero: null, fecha: '', hora: '' }); setTurnoId(null); setErrorMsg(null) }}
              className="text-[10px] font-black uppercase text-slate-600 hover:text-slate-400 transition-colors border-b border-slate-800 pb-0.5">
              Reservar otro turno
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

function ConfirmarOGuest({
  user, colorP, confirmando, errorMsg, onConfirmar, onConfirmarGuest, onLoginGoogle
}: {
  user: { email?: string } | null
  colorP: string
  confirmando: boolean
  errorMsg: string | null
  onConfirmar: () => void
  onConfirmarGuest: (nombre: string, tel: string) => void
  onLoginGoogle: () => void
}) {
  const [modo, setModo] = useState<'google' | 'guest'>('google')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('')

  if (user) return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500 text-center">
        Reservando como <span className="text-white/60 font-bold">{user.email}</span>
      </p>
      {errorMsg && <p className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm font-bold">{errorMsg}</p>}
      <button onClick={onConfirmar} disabled={confirmando}
        className="w-full py-5 rounded-[1.75rem] font-black italic text-lg text-black transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: colorP }}>
        {confirmando ? 'Reservando...' : 'Confirmar Turno'}
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 border border-white/8 p-1 rounded-2xl">
        <button onClick={() => setModo('google')}
          className={'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ' +
            (modo === 'google' ? 'text-black' : 'text-slate-400 hover:text-white')}
          style={modo === 'google' ? { backgroundColor: colorP } : {}}>
          Con Google
        </button>
        <button onClick={() => setModo('guest')}
          className={'flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ' +
            (modo === 'guest' ? 'text-black' : 'text-slate-400 hover:text-white')}
          style={modo === 'guest' ? { backgroundColor: colorP } : {}}>
          Sin cuenta
        </button>
      </div>

      {modo === 'google' ? (
        <button onClick={onLoginGoogle}
          className="w-full py-4 bg-white text-black font-black italic uppercase rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors">
          <GoogleIcon />
          Continuar con Google
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Tu nombre</label>
            <input type="text" value={nombre} onChange={e => { setNombre(e.target.value) }}
              placeholder="Ej: Juan Perez"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Teléfono (opcional)</label>
            <input type="tel" value={tel} onChange={e => setTel(e.target.value)}
              placeholder="Ej: 11 1234-5678"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
          </div>
          {errorMsg && <p className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 text-red-400 text-sm">{errorMsg}</p>}
          <button
            onClick={() => { onConfirmarGuest(nombre, tel) }}
            disabled={confirmando || !nombre.trim()}
            className="w-full py-4 rounded-2xl font-black italic text-lg text-black transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colorP }}>
            {confirmando ? 'Reservando...' : 'Confirmar sin cuenta'}
          </button>
          <p className="text-[9px] text-slate-600 text-center">No necesitas crear una cuenta para reservar.</p>
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function WAIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.523 5.849L0 24l6.335-1.498A11.947 11.947 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.022-1.381l-.36-.214-3.735.882.936-3.625-.234-.372A9.818 9.818 0 012.18 12C2.18 6.58 6.58 2.18 12 2.18S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  )
}
// Thu Mar 26 20:14:41 UTC 2026
// redeploy Thu Mar 26 20:32:53 UTC 2026
