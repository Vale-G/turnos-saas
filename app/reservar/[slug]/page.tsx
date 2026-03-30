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
type Turno    = { id: string; fecha: string; hora: string; estado: string; servicio?: { nombre: string; precio: number } }
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

  useEffect(() => {
    async function init() {
      const { data: neg } = await supabase.from('negocio').select('*').eq('slug', slug).single()
      if (!neg) { setLoading(false); return }
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
  }, [slug])

  const cargarMisTurnos = useCallback(async (userId: string) => {
    // FIX 400: servicio en minúscula
    const { data } = await supabase
      .from('turno')
      .select('id, fecha, hora, estado, servicio(nombre, precio)')
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

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    // FIX BLOQUEO: Buscar todos los turnos del staff en ese dia sin importar si es invitado o no
    supabase.from('turno').select('hora')
      .eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      .then(({ data }) => setOcupados((data ?? []).map((t: { hora: string }) => t.hora.slice(0, 5))))
  }, [sel.barbero, sel.fecha])

  const metricas = useMemo(() => {
    if (!misTurnos.length) return null
    const completados = misTurnos.filter(t => t.estado === 'completado')
    const proximos = misTurnos.filter(t =>
      ['pendiente', 'confirmado'].includes(t.estado) &&
      t.fecha >= new Date().toISOString().split('T')[0]
    )
    const frecuencia: Record<string, number> = {}
    completados.forEach(t => { const n = t.servicio?.nombre ?? '?'; frecuencia[n] = (frecuencia[n] ?? 0) + 1 })
    const favorito = Object.entries(frecuencia).sort((a, b) => b[1] - a[1])[0]?.[0]
    return {
      totalVisitas: completados.length,
      proximoTurno: proximos[0] ?? null,
      favorito,
      totalGastado: completados.reduce((s, t) => s + (t.servicio?.precio ?? 0), 0),
    }
  }, [misTurnos])

  const colorP = getThemeColor(negocio?.tema)
  const progress = ({ 1: 33, 2: 66, 3: 100 } as Record<number, number>)[paso] ?? 0

  const generarHoras = (): string[] => {
    if (!negocio?.hora_apertura || !negocio?.hora_cierre || !sel.servicio) return []
    const lista: string[] = []
    let act = negocio.hora_apertura
    const TZ_AR = 'America/Argentina/Buenos_Aires'
    const ahoraAR = new Date()
    const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_AR }).format(ahoraAR)
    const esHoy = sel.fecha === hoyStr
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ_AR, hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(ahoraAR)
    const horaAR = parseInt(partes.find(p => p.type === 'hour')?.value ?? '0')
    const minutoAR = parseInt(partes.find(p => p.type === 'minute')?.value ?? '0')
    const minutosAhora = horaAR * 60 + minutoAR + 15

    while (act < negocio.hora_cierre) {
      const hF = act.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      const minHora = hh * 60 + mm
      const yaPaso = esHoy && minHora <= minutosAhora
      if (!ocupados.includes(hF) && !yaPaso) lista.push(hF)
      let [h, m] = act.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      act = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00'
    }
    return lista
  }

  const confirmarTurnoGuest = async (gNombre: string, gTel: string) => {
    if (!negocio || !sel.servicio || !sel.barbero || !gNombre.trim()) return
    setConfirmando(true)
    const { data, error } = await supabase.from('turno').insert({
      negocio_id: negocio.id,
      servicio_id: sel.servicio.id,
      staff_id: sel.barbero.id,
      fecha: sel.fecha,
      hora: sel.hora + ':00',
      cliente_id: null,
      cliente_nombre: gNombre.trim() + (gTel ? ' · ' + gTel : ''),
      estado: 'pendiente',
      pago_estado: 'pendiente',
    }).select('id').single()
    if (error) setErrorMsg(error.message)
    else { setTurnoId(data.id); setPaso(4) }
    setConfirmando(false)
  }

  const confirmarTurno = async () => {
    if (!user || !negocio || !sel.servicio || !sel.barbero) return
    setConfirmando(true)
    const { data, error } = await supabase.from('turno').insert({
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
    if (error) setErrorMsg(error.message)
    else { setTurnoId(data.id); setPaso(4) }
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">Cargando...</div>
  
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="max-w-md mx-auto px-5 pb-16">
        <header className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base border border-white/10" style={{ background: colorP + '18', color: colorP }}>{negocio.nombre[0]}</div>
              <div><p className="text-xs font-black italic" style={{ color: colorP }}>{negocio.nombre}</p><p className="text-[10px] text-slate-500 font-bold">Reserva online</p></div>
            </div>
          </div>
          <div className="mt-3 h-0.5 w-full bg-white/8 rounded-full"><div className="h-full rounded-full transition-all duration-500" style={{ width: progress + '%', backgroundColor: colorP }} /></div>
        </header>

        {paso === 1 && (
          <section className="pt-8 space-y-3">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">¿Qué servicio querés?</h2>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({ ...sel, servicio: s }); setPaso(2) }} className="w-full bg-white/4 border border-white/8 p-5 rounded-[1.75rem] flex justify-between items-center transition-all active:scale-95">
                <div className="text-left"><h3 className="font-black italic uppercase text-lg">{s.nombre}</h3><p className="text-slate-500 text-[10px] font-bold uppercase">{s.duracion} min</p></div>
                <span className="font-black italic text-xl" style={{ color: colorP }}>${s.precio.toLocaleString()}</span>
              </button>
            ))}
          </section>
        )}

        {paso === 2 && (
          <section className="pt-8 space-y-6">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black text-slate-500 uppercase">Volver</button>
            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">Con quién?</h2>
              <div className="grid grid-cols-2 gap-3">
                {staffList.map(p => (
                  <button key={p.id} onClick={() => setSel({ ...sel, barbero: p })} className={'p-5 rounded-[1.5rem] border text-center transition-all ' + (sel.barbero?.id === p.id ? 'border-white/40 bg-white/10' : 'border-white/8 bg-white/4')}>
                    <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-black text-lg border border-white/10" style={{ background: colorP + '18', color: colorP }}>{p.nombre[0]}</div>
                    <h3 className="font-black italic uppercase text-[10px]">{p.nombre}</h3>
                  </button>
                ))}
              </div>
            </div>
            {sel.barbero && (
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight mb-4">Qué día?</h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[0,1,2,3,4,5,6].map(o => {
                    const d = new Date(); d.setDate(d.getDate() + o); const iso = d.toISOString().split('T')[0]
                    return <button key={iso} onClick={() => setSel({ ...sel, fecha: iso, hora: '' })} className={'flex-shrink-0 w-20 h-20 rounded-2xl border font-black transition-all ' + (sel.fecha === iso ? 'text-black' : 'border-white/8 bg-white/4')} style={sel.fecha === iso ? {backgroundColor: colorP} : {}}><div className="text-[9px] uppercase">{d.toLocaleDateString('es-ES',{weekday:'short'})}</div><div className="text-xl">{d.getDate()}</div></button>
                  })}
                </div>
              </div>
            )}
            {sel.fecha && (
              <div className="grid grid-cols-4 gap-2">
                {generarHoras().map(h => <button key={h} onClick={() => setSel({ ...sel, hora: h })} className={'py-3 rounded-xl font-black text-[10px] border transition-all ' + (sel.hora === h ? 'text-black border-transparent' : 'bg-white/4 border-white/8')} style={sel.hora === h ? {backgroundColor: colorP} : {}}>{h}</button>)}
              </div>
            )}
            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-5 rounded-[1.75rem] font-black italic text-lg text-black" style={{ backgroundColor: colorP }}>Continuar</button>}
          </section>
        )}

        {paso === 3 && (
          <section className="pt-8 space-y-5">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black text-slate-500 uppercase">Volver</button>
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Confirmar Turno</h2>
            <div className="bg-white/4 border border-white/8 rounded-[2rem] p-5 space-y-3">
               <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-500">Servicio</span><span>{sel.servicio?.nombre}</span></div>
               <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-500">Barbero</span><span>{sel.barbero?.nombre}</span></div>
               <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-500">Horario</span><span>{sel.fecha} · {sel.hora} hs</span></div>
            </div>
            <ConfirmarTab user={user} colorP={colorP} confirmando={confirmando} onConfirmar={confirmarTurno} onConfirmarGuest={confirmarTurnoGuest} onLogin={() => supabase.auth.signInWithOAuth({provider:'google'})} />
          </section>
        )}

        {paso === 4 && (
          <section className="pt-16 text-center space-y-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl font-black text-black" style={{ backgroundColor: colorP }}>OK</div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">¡Turno Confirmado!</h2>
            <button onClick={() => { setPaso(1); setSel({ servicio: null, barbero: null, fecha: '', hora: '' }) }} className="text-[10px] font-black uppercase text-slate-500 border-b border-white/10 pb-1">Reservar otro turno</button>
          </section>
        )}
      </div>
    </div>
  )
}

function ConfirmarTab({ user, colorP, confirmando, onConfirmar, onConfirmarGuest, onLogin }: any) {
  const [modo, setModo] = useState('guest'); const [n, setN] = useState(''); const [t, setT] = useState('')
  if (user) return <button onClick={onConfirmar} disabled={confirmando} className="w-full py-5 rounded-[1.75rem] font-black italic text-lg text-black" style={{ backgroundColor: colorP }}>{confirmando ? 'Reservando...' : 'Confirmar con ' + user.email}</button>
  return (
    <div className="space-y-4">
      <div className="flex gap-2 bg-white/5 border border-white/8 p-1 rounded-2xl">
        <button onClick={() => setModo('google')} className={'flex-1 py-2 rounded-xl text-[10px] font-black uppercase ' + (modo === 'google' ? 'text-black' : 'text-slate-400')} style={modo === 'google' ? {backgroundColor:colorP} : {}}>Google</button>
        <button onClick={() => setModo('guest')} className={'flex-1 py-2 rounded-xl text-[10px] font-black uppercase ' + (modo === 'guest' ? 'text-black' : 'text-slate-400')} style={modo === 'guest' ? {backgroundColor:colorP} : {}}>Sin cuenta</button>
      </div>
      {modo === 'google' ? <button onClick={onLogin} className="w-full py-4 bg-white text-black font-black italic uppercase rounded-2xl">Continuar con Google</button> : (
        <div className="space-y-3">
          <input type="text" placeholder="Tu nombre" value={n} onChange={e => setN(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" />
          <input type="tel" placeholder="Tu celular (opcional)" value={t} onChange={e => setT(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm outline-none" />
          <button onClick={() => onConfirmarGuest(n, t)} disabled={confirmando || !n.trim()} className="w-full py-4 rounded-2xl font-black italic text-lg text-black" style={{ backgroundColor: colorP }}>{confirmando ? 'Reservando...' : 'Confirmar Reserva'}</button>
        </div>
      )}
    </div>
  )
}
