'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }
function getBaMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: BA_TZ, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date())
  return parseInt(parts.find(p => p.type === 'hour')?.value ?? '0') * 60 + parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
}
function getDayOfWeek(dateStr: string): number { return new Date(`${dateStr}T12:00:00-03:00`).getDay() }
function generateDias() {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400000)
    return { iso: toBaDateStr(d), weekday: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, weekday: 'short' }).format(d), day: new Intl.DateTimeFormat('es-AR', { timeZone: BA_TZ, day: 'numeric' }).format(d) }
  })
}

export default function ReservaPage() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [bloqueos, setBloqueos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [sel, setSel] = useState<any>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [exito, setExito] = useState(false)
  const [user, setUser] = useState<any>(null)

  const colorP = getThemeColor(negocio?.tema)
  const dias = useMemo(() => generateDias(), [])
  const diasLaborales: number[] = negocio?.dias_laborales ?? [1, 2, 3, 4, 5, 6]

  useEffect(() => {
    async function init() {
      const { data: neg } = await supabase.from('negocio').select('*').eq('slug', slug).single()
      if (!neg) return setLoading(false)
      setNegocio(neg)
      const [{ data: svcs }, { data: stf }] = await Promise.all([
        supabase.from('servicio').select('*').eq('negocio_id', neg.id),
        supabase.from('staff').select('*').eq('negocio_id', neg.id).eq('activo', true)
      ])
      setServicios(svcs ?? []); setStaffList(stf ?? []); setLoading(false)
    }
    init()
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user || null))
  }, [slug])

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    async function check() {
      // Traemos turnos Y bloqueos
      const [{ data: t }, { data: b }] = await Promise.all([
        supabase.from('turno').select('hora').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado'),
        supabase.from('bloqueo').select('hora_inicio, hora_fin').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha)
      ])
      setOcupados((t ?? []).map((i: any) => i.hora.slice(0, 5)))
      setBloqueos(b ?? [])
    }
    check()
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
      const minActual = hh * 60 + mm
      
      // Chequeo si esta ocupado por un turno
      const estaOcupado = ocupados.includes(hF)
      
      // Chequeo si cae adentro de un bloqueo manual
      const estaBloqueado = bloqueos.some(b => {
        const [hStart, mStart] = b.hora_inicio.split(':').map(Number)
        const [hEnd, mEnd] = b.hora_fin.split(':').map(Number)
        const mS = hStart * 60 + mStart
        const mE = hEnd * 60 + mEnd
        return minActual >= mS && minActual < mE
      })

      if (!estaOcupado && !estaBloqueado && (!esHoy || minActual >= minLimite)) {
        list.push(hF)
      }
      
      let [h, m] = curr.split(':').map(Number); m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      curr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    }
    return list
  }, [negocio, sel.servicio, sel.fecha, ocupados, bloqueos])

  const handleFinal = async (nombre: string, tel: string, pagarSena: boolean, correoInvitado: string) => {
    setConfirmando(true)
    const cliNombre = user ? (user.user_metadata?.full_name || user.email) : `${nombre} · ${tel}`
    const correoFinal = user ? user.email : correoInvitado
    
    const { data: turno, error } = await supabase.from('turno').insert({
      negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id,
      fecha: sel.fecha, hora: sel.hora + ':00', cliente_id: user?.id || null,
      cliente_nombre: cliNombre, estado: 'pendiente'
    }).select('id').single()

    if (error) { toast.error('Error al reservar'); setConfirmando(false); return }

    fetch('/api/notificar', {
      method: 'POST',
      body: JSON.stringify({ clienteNombre: cliNombre, clienteEmail: correoFinal, negocioNombre: negocio.nombre, fecha: sel.fecha, hora: sel.hora, servicio: sel.servicio.nombre, emailNegocio: negocio.email_contacto })
    }).catch(console.error)

    if (pagarSena && sel.servicio.precio > 0) {
      const res = await fetch('/api/sena', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turno_id: turno.id, monto_sena: Math.round(sel.servicio.precio * 0.5), servicio_nombre: sel.servicio.nombre, negocio_nombre: negocio.nombre, cliente_email: correoFinal })
      })
      const resData = await res.json()
      if (resData.url) { window.location.href = resData.url; return } 
    }

    setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">CARGANDO...</div>
  if (!negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-slate-500">NEGOCIO NO ENCONTRADO</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20">
      <div className="max-w-md mx-auto px-6">
        <header className="py-8 flex items-center justify-between border-b border-white/5 mb-8">
          <div className="flex items-center gap-4">
            {negocio.logo_url ? <img src={negocio.logo_url} className="w-14 h-14 rounded-2xl object-cover border border-white/10" /> : <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/10" style={{ background: colorP + '20', color: colorP }}>{negocio.nombre[0]}</div>}
            <div><h1 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: colorP }}>{negocio.nombre}</h1><p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Reserva online</p></div>
          </div>
        </header>

        {exito ? (
          <div className="pt-20 text-center animate-in zoom-in-95">
            <div className="w-28 h-28 rounded-full border-4 mx-auto mb-8 flex items-center justify-center text-5xl" style={{ borderColor: colorP, color: colorP, boxShadow: `0 0 80px ${colorP}30` }}>✓</div>
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-4">¡Turno Listo!</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mb-12">{sel.fecha} A LAS {sel.hora} HS</p>
            <button onClick={() => window.location.reload()} className="font-black uppercase italic text-lg px-12 py-5 rounded-[2rem] text-black shadow-xl" style={{ backgroundColor: colorP }}>Genial</button>
          </div>
        ) : paso === 1 ? (
          <div className="animate-in fade-in">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Elegí un servicio</p>
            <div className="space-y-4">
              {servicios.map(s => (
                <div key={s.id} onClick={() => { setSel({ ...sel, servicio: s }); setPaso(2) }} className="bg-white/4 border border-white/5 hover:border-white/20 p-8 rounded-[3rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98]">
                  <div><p className="font-black italic uppercase text-2xl mb-1 tracking-tighter" style={{ color: colorP }}>{s.nombre}</p><p className="text-[10px] text-slate-500 font-black uppercase">{s.duracion} MINUTOS</p></div>
                  <p className="text-3xl font-black italic">${s.precio}</p>
                </div>
              ))}
            </div>
          </div>
        ) : paso === 2 ? (
          <div className="space-y-12 animate-in slide-in-from-right-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white">← Volver</button>
            <div className="bg-white/4 border border-white/5 rounded-3xl px-6 py-4 flex justify-between items-center">
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
                    return <div key={iso} onClick={() => esLaboral && setSel({ ...sel, fecha: iso, hora: '' })} className={`flex-shrink-0 w-16 h-24 rounded-[2rem] border flex flex-col items-center justify-center ${!esLaboral ? 'opacity-20' : activo ? 'border-transparent' : 'bg-white/4 border-white/5'}`} style={activo && esLaboral ? { backgroundColor: colorP } : {}}><p className={`text-[9px] font-black uppercase mb-2 ${activo?'text-black':'text-slate-500'}`}>{weekday}</p><p className={`text-2xl font-black ${activo?'text-black':''}`}>{day}</p></div>
                  })}
                </div>
              </div>
            )}
            {sel.fecha && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Horarios Libres</p>
                {horas.length === 0 ? <div className="text-center py-10 bg-white/4 rounded-[3rem] border border-dashed border-white/10"><p className="text-slate-500 text-[10px] font-black uppercase">Sin Cupos</p></div> : (
                  <div className="grid grid-cols-4 gap-3">
                    {horas.map(h => <div key={h} onClick={() => setSel({ ...sel, hora: h })} className={`py-5 rounded-2xl text-[11px] font-black text-center cursor-pointer border ${sel.hora === h ? 'border-transparent shadow-lg' : 'bg-white/4 border-white/5'}`} style={sel.hora === h ? { backgroundColor: colorP, color: 'black' } : {}}>{h}</div>)}
                  </div>
                )}
              </div>
            )}
            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black shadow-2xl mt-4" style={{ backgroundColor: colorP }}>Continuar</button>}
          </div>
        ) : (
          <div className="space-y-8 animate-in zoom-in-95">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            <div className="bg-white/4 border border-white/5 rounded-[4rem] p-10">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] mb-8 text-center">Ticket de Reserva</p>
              <div className="text-center mb-10 space-y-3">
                <p className="text-4xl font-black italic uppercase leading-none" style={{ color: colorP }}>{sel.servicio?.nombre}</p>
                <p className="font-black uppercase text-xs tracking-[0.3em] text-white pt-2">{sel.fecha} · {sel.hora} HS</p>
                <p className="text-4xl font-black pt-4">${sel.servicio?.precio}</p>
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
  const [nombre, setNombre] = useState(''); const [tel, setTel] = useState(''); const [correo, setCorreo] = useState('')
  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) } })

  const renderBotones = (accion: (sena: boolean) => void) => (
    <div className="space-y-3 mt-6">
      {precio > 0 && <button onClick={() => accion(true)} disabled={loading} className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-sm text-black hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: colorP }}><span className="flex flex-col"><span>Abonar Seña (50%)</span><span className="text-[10px] font-bold opacity-70 mt-1">Con MercadoPago</span></span></button>}
      <button onClick={() => accion(false)} disabled={loading} className="w-full py-5 rounded-[2.5rem] font-black uppercase italic text-xs text-white bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50">{loading ? 'PROCESANDO...' : 'RESERVAR Y PAGAR EN LOCAL'}</button>
    </div>
  )

  if (user) return renderBotones((s) => onConfirm('', '', s, ''))
  return (
    <div className="space-y-6">
      <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5">
        <button onClick={() => setModo('invitado')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'invitado' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Invitado</button>
        <button onClick={() => setModo('google')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'google' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Google</button>
      </div>
      {modo === 'google' ? <button onClick={login} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[2rem]">Ingresar con Google</button> : (
        <div className="space-y-4">
          <input type="text" placeholder="TU NOMBRE (EJ: JUAN PEREZ)" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" />
          <input type="tel" placeholder="WHATSAPP (EJ: 1123456789)" value={tel} onChange={e => setTel(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-[1.5rem] p-5 text-[11px] font-black uppercase outline-none focus:border-white/30" />
          <input type="email" placeholder="TU EMAIL (PARA RECIBIR EL TICKET)" value={correo} onChange={e => setCorreo(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 p-5 rounded-[1.5rem] text-[11px] font-black uppercase outline-none focus:border-emerald-500/50" />
          {renderBotones((s) => onConfirm(nombre, tel, s, correo))}
        </div>
      )}
    </div>
  )
}
