'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

export default function ReservaLuxury() {
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
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
  }, [slug])

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    async function check() {
      const { data } = await supabase.from('turno').select('hora').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      setOcupados((data ?? []).map((t: any) => t.hora.slice(0, 5)))
    }
    check()
  }, [sel.barbero, sel.fecha])

  const colorP = getThemeColor(negocio?.tema)

  const horas = useMemo(() => {
    if (!negocio || !sel.servicio) return []
    const list = []
    let curr = negocio.hora_apertura
    
    const ahora = new Date()
    const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora)
    const esHoy = sel.fecha === hoyStr
    
    // Obtener minutos actuales en Argentina
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(ahora)
    const hAct = parseInt(fmt.find(p => p.type === 'hour')?.value || '0')
    const mAct = parseInt(fmt.find(p => p.type === 'minute')?.value || '0')
    const minutosAhora = hAct * 60 + mAct + 20 // Buffer de 20min

    while (curr < negocio.hora_cierre) {
      const hF = curr.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      const yaPaso = esHoy && (hh * 60 + mm) < minutosAhora
      if (!ocupados.includes(hF) && !yaPaso) list.push(hF)
      let [h, m] = curr.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      curr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
    }
    return list
  }, [negocio, sel.servicio, sel.fecha, ocupados])

  const handleFinal = async (nombre: string, tel: string) => {
    setConfirmando(true)
    const cliNombre = user ? (user.user_metadata?.full_name || user.email) : `${nombre} · ${tel}`
    const { error } = await supabase.from('turno').insert({
      negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id,
      fecha: sel.fecha, hora: sel.hora + ':00', cliente_id: user?.id || null,
      cliente_nombre: cliNombre, estado: 'pendiente'
    })
    if (!error) setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black italic text-white text-2xl animate-pulse">CARGANDO...</div>
  if (exito) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-12 text-center">
      <div className="w-24 h-24 rounded-full border-4 mb-8 flex items-center justify-center text-4xl animate-bounce" style={{borderColor: colorP, color: colorP}}>✓</div>
      <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-4">¡Listo!</h2>
      <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-xs">Tu turno está agendado.</p>
      <button onClick={() => window.location.reload()} className="px-12 py-5 bg-white text-black font-black uppercase italic rounded-2xl">Volver</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div className="max-w-md mx-auto px-6 pt-12 pb-20">
        <header className="flex flex-col items-center mb-16">
          <div className="w-20 h-20 rounded-[2.5rem] border-2 flex items-center justify-center text-3xl font-black mb-4" style={{borderColor: colorP + '40', background: colorP + '10', color: colorP}}>{negocio.nombre[0]}</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">{negocio.nombre}</h1>
        </header>

        {paso === 1 && (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Seleccioná Servicio</h2>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({...sel, servicio: s}); setPaso(2) }} className="w-full bg-white/5 border border-white/5 p-8 rounded-[2.5rem] flex justify-between items-center hover:bg-white/10 transition-all active:scale-95">
                <div className="text-left"><p className="font-black italic uppercase text-xl mb-1">{s.nombre}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{s.duracion} MIN</p></div>
                <p className="text-2xl font-black italic" style={{color: colorP}}>${s.precio}</p>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-10">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">¿Quién te atiende?</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => (
                  <button key={st.id} onClick={() => setSel({...sel, barbero: st})} className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border transition-all ${sel.barbero?.id === st.id ? 'bg-white text-black' : 'bg-white/5 border-white/5'}`} style={sel.barbero?.id === st.id ? {borderColor: colorP} : {}}>
                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl ${sel.barbero?.id === st.id ? 'bg-black text-white' : 'bg-white/10'}`}>{st.nombre[0]}</div>
                    <p className="text-[10px] font-black uppercase truncate">{st.nombre}</p>
                  </button>
                ))}
              </div>
            </section>
            {sel.barbero && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Elegí el día</h2>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {[0,1,2,3,4,5,6].map(i => {
                    const d = new Date(); d.setDate(d.getDate() + i); const iso = d.toISOString().split('T')[0]
                    const act = sel.fecha === iso
                    return <button key={iso} onClick={() => setSel({...sel, fecha: iso, hora: ''})} className={`flex-shrink-0 w-16 h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${act ? 'bg-white text-black' : 'bg-white/5 border-white/5'}`} style={act ? {borderColor: colorP} : {}}><p className="text-[8px] font-black uppercase mb-1">{d.toLocaleDateString('es-ES', {weekday:'short'})}</p><p className="text-2xl font-black">{d.getDate()}</p></button>
                  })}
                </div>
              </section>
            )}
            {sel.fecha && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6">Horarios</h2>
                <div className="grid grid-cols-4 gap-2">
                  {horas.map(h => (
                    <button key={h} onClick={() => setSel({...sel, hora: h})} className={`py-4 rounded-xl text-xs font-black transition-all ${sel.hora === h ? 'bg-white text-black' : 'bg-white/5 border-white/10'}`} style={sel.hora === h ? {backgroundColor: colorP} : {}}>{h}</button>
                  ))}
                </div>
              </section>
            )}
            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg text-black" style={{backgroundColor: colorP}}>Confirmar</button>}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-8">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            <div className="bg-white/5 border border-white/5 rounded-[3rem] p-10">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-6 tracking-widest">Resumen</p>
              <p className="text-4xl font-black italic uppercase mb-2" style={{color: colorP}}>{sel.servicio?.nombre}</p>
              <p className="font-black uppercase text-xs mb-8">{sel.fecha} · {sel.hora} HS</p>
              <AuthSelector user={user} colorP={colorP} loading={confirmando} onConfirm={handleFinal} slug={slug} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthSelector({ user, colorP, loading, onConfirm, slug }: any) {
  const [modo, setModo] = useState('invitado'); const [n, setN] = useState(''); const [t, setT] = useState('')
  const login = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getOAuthRedirectUrl('/auth/callback?next=/reservar/' + slug) } })

  if (user) return <button onClick={() => onConfirm()} disabled={loading} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg text-black" style={{backgroundColor: colorP}}>{loading ? 'RESERVANDO...' : 'RESERVAR COMO ' + (user.user_metadata?.full_name?.split(' ')[0] || 'USUARIO')}</button>

  return (
    <div className="space-y-6">
      <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
        <button onClick={() => setModo('invitado')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${modo === 'invitado' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Invitado</button>
        <button onClick={() => setModo('google')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${modo === 'google' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Google</button>
      </div>
      {modo === 'google' ? <button onClick={login} className="w-full py-4 bg-white text-black font-black uppercase italic rounded-2xl">Entrar con Google</button> : (
        <div className="space-y-4">
          <input type="text" placeholder="TU NOMBRE" value={n} onChange={e => setN(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-black uppercase outline-none" />
          <input type="tel" placeholder="WHATSAPP" value={t} onChange={e => setT(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xs font-black uppercase outline-none" />
          <button onClick={() => onConfirm(n, t)} disabled={loading || !n.trim()} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg text-black" style={{backgroundColor: colorP}}>{loading ? 'RESERVANDO...' : 'CONFIRMAR AHORA'}</button>
        </div>
      )}
    </div>
  )
}
