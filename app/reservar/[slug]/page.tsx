'use client'
import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type Negocio = {
  id: string; nombre: string; slug: string; tema?: string
  hora_apertura?: string; hora_cierre?: string
  dias_laborales?: number[]; whatsapp?: string
}
type Servicio = { id: string; nombre: string; precio: number; duracion: number }
type Staff    = { id: string; nombre: string; avatar_url?: string | null }
type Turno    = { id: string; fecha: string; hora: string; estado: string; servicio?: { nombre: string; precio: number } }
type Sel      = { servicio: Servicio | null; barbero: Staff | null; fecha: string; hora: string }

export default function ReservaPro() {
  const { slug } = useParams()
  const [negocio,     setNegocio]     = useState<Negocio | null>(null)
  const [servicios,   setServicios]   = useState<Servicio[]>([])
  const [staffList,   setStaffList]   = useState<Staff[]>([])
  const [ocupados,    setOcupados]    = useState<string[]>([])
  const [loading,     setLoading]     = useState(true)
  const [user,        setUser]        = useState<User | null>(null)
  const [misTurnos,   setMisTurnos]   = useState<Turno[]>([])
  const [paso,        setPaso]        = useState(1)
  const [sel,         setSel]         = useState<Sel>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [confirmando, setConfirmando] = useState(false)
  const [turnoId,     setTurnoId]     = useState<string | null>(null)
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
    const { data } = await supabase
      .from('turno')
      .select('id, fecha, hora, estado, servicio(nombre, precio)')
      .eq('cliente_id', userId)
      .order('fecha', { ascending: false })
      .limit(8)
    setMisTurnos((data as any) ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); cargarMisTurnos(session.user.id) }
    })
  }, [cargarMisTurnos])

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    supabase.from('turno').select('hora')
      .eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      .then(({ data }) => setOcupados((data ?? []).map((t: any) => t.hora.slice(0, 5))))
  }, [sel.barbero, sel.fecha])

  const colorP = getThemeColor(negocio?.tema)

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
      if (!ocupados.includes(hF) && (!esHoy || (hh * 60 + mm) > minutosAhora)) lista.push(hF)
      let [h, m] = act.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      act = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00'
    }
    return lista
  }

  const confirmarTurnoGuest = async (n: string, t: string) => {
    if (!negocio || !sel.servicio || !sel.barbero) return
    setConfirmando(true)
    const { data } = await supabase.from('turno').insert({
      negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id,
      fecha: sel.fecha, hora: sel.hora + ':00', cliente_nombre: n + (t ? ' · ' + t : '')
    }).select('id').single()
    if (data) { setTurnoId(data.id); setPaso(4) }
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">Cargando...</div>
  if (!negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black">Negocio no encontrado</div>
  
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="max-w-md mx-auto px-5 pb-16">
        <header className="py-6 border-b border-white/10 mb-8">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border border-white/10" style={{ background: colorP + '20', color: colorP }}>
               {negocio.nombre[0]}
             </div>
             <div>
               <h1 className="text-xl font-black italic uppercase tracking-tighter" style={{ color: colorP }}>{negocio.nombre}</h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reserva Online</p>
             </div>
          </div>
        </header>

        {paso === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">¿Qué servicio buscás?</h2>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({...sel, servicio: s}); setPaso(2) }} className="w-full bg-white/5 border border-white/10 p-5 rounded-[2rem] flex justify-between items-center hover:bg-white/10 transition-all">
                <div className="text-left"><p className="font-black italic uppercase text-lg">{s.nombre}</p><p className="text-xs text-slate-500">{s.duracion} min</p></div>
                <p className="text-xl font-black" style={{ color: colorP }}>${s.precio}</p>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">← Volver</button>
            <div className="grid grid-cols-2 gap-3">
              {staffList.map(st => (
                <button key={st.id} onClick={() => setSel({...sel, barbero: st})} className={'p-6 rounded-[2rem] border text-center transition-all ' + (sel.barbero?.id === st.id ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5')}>
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl border border-white/10" style={{ background: colorP + '20', color: colorP }}>{st.nombre[0]}</div>
                  <p className="font-black italic uppercase text-xs">{st.nombre}</p>
                </button>
              ))}
            </div>
            {sel.barbero && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {[0,1,2,3,4,5,6].map(i => {
                  const d = new Date(); d.setDate(d.getDate() + i); const iso = d.toISOString().split('T')[0]
                  return <button key={iso} onClick={() => setSel({...sel, fecha: iso, hora: ''})} className={'flex-shrink-0 w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-black transition-all ' + (sel.fecha === iso ? 'text-black border-transparent' : 'bg-white/5 border-white/10')} style={sel.fecha === iso ? {backgroundColor: colorP} : {}}><p className="text-[9px] uppercase">{d.toLocaleDateString('es-ES', {weekday:'short'})}</p><p className="text-xl">{d.getDate()}</p></button>
                })}
              </div>
            )}
            {sel.fecha && (
              <div className="grid grid-cols-4 gap-2">
                {generarHoras().map(h => <button key={h} onClick={() => setSel({...sel, hora: h})} className={'py-3 rounded-xl font-black text-xs border transition-all ' + (sel.hora === h ? 'text-black border-transparent' : 'bg-white/5 border-white/10')} style={sel.hora === h ? {backgroundColor: colorP} : {}}>{h}</button>)}
              </div>
            )}
            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-5 rounded-[2rem] font-black italic text-lg text-black transition-opacity hover:opacity-90" style={{ backgroundColor: colorP }}>Continuar</button>}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-6">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">← Volver</button>
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
              <div className="flex justify-between border-b border-white/5 pb-4"><p className="text-[10px] text-slate-500 font-black uppercase">Servicio</p><p className="font-black italic uppercase">{sel.servicio?.nombre}</p></div>
              <div className="flex justify-between border-b border-white/5 pb-4"><p className="text-[10px] text-slate-500 font-black uppercase">Barbero</p><p className="font-black italic uppercase">{sel.barbero?.nombre}</p></div>
              <div className="flex justify-between"><p className="text-[10px] text-slate-500 font-black uppercase">Fecha</p><p className="font-black italic uppercase">{sel.fecha} · {sel.hora} hs</p></div>
            </div>
            <FormGuest onConfirmar={confirmarTurnoGuest} colorP={colorP} confirmando={confirmando} />
          </div>
        )}

        {paso === 4 && (
          <div className="pt-20 text-center space-y-6">
             <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl border-4 border-white/10" style={{ color: colorP }}>✓</div>
             <h2 className="text-4xl font-black italic uppercase tracking-tighter">¡Listo!</h2>
             <p className="text-slate-400 text-sm">Tu turno fue reservado con éxito.</p>
             <button onClick={() => window.location.reload()} className="px-8 py-4 rounded-2xl bg-white/10 font-black uppercase text-xs">Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  )
}

function FormGuest({ onConfirmar, colorP, confirmando }: any) {
  const [n, setN] = useState(''); const [t, setT] = useState('')
  return (
    <div className="space-y-4">
      <input type="text" placeholder="Tu nombre" value={n} onChange={e => setN(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-white/20 transition-all" />
      <input type="tel" placeholder="WhatsApp (opcional)" value={t} onChange={e => setT(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-white/20 transition-all" />
      <button onClick={() => onConfirmar(n, t)} disabled={confirmando || !n.trim()} className="w-full py-5 rounded-[2rem] font-black italic text-lg text-black disabled:opacity-50" style={{ backgroundColor: colorP }}>{confirmando ? 'Reservando...' : 'Confirmar Turno'}</button>
    </div>
  )
}
