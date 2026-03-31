'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

export default function ReservaPremium() {
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
  }, [slug])

  useEffect(() => {
    if (!sel.barbero || !sel.fecha) return
    async function checkOcupados() {
      const { data } = await supabase.from('turno')
        .select('hora')
        .eq('staff_id', sel.barbero.id)
        .eq('fecha', sel.fecha)
        .not('estado', 'eq', 'cancelado')
      setOcupados((data ?? []).map((t: any) => t.hora.slice(0, 5)))
    }
    checkOcupados()
  }, [sel.barbero, sel.fecha])

  const colorP = getThemeColor(negocio?.tema)

  const horasDisponibles = useMemo(() => {
    if (!negocio || !sel.servicio) return []
    const horas = []
    let actual = negocio.hora_apertura
    
    // Timezone Argentina
    const ahora = new Date()
    const hoyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora)
    const esHoy = sel.fecha === hoyStr
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes() + 20 // 20min de margen

    while (actual < negocio.hora_cierre) {
      const hF = actual.slice(0, 5)
      const [hh, mm] = hF.split(':').map(Number)
      const yaPaso = esHoy && (hh * 60 + mm) < horaActual
      
      if (!ocupados.includes(hF) && !yaPaso) horas.push(hF)
      
      let [h, m] = actual.split(':').map(Number)
      m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m / 60); m %= 60 }
      actual = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
    }
    return horas
  }, [negocio, sel.servicio, sel.fecha, ocupados])

  const handleConfirmar = async (nombre: string, tel: string) => {
    if (!nombre.trim()) return
    setConfirmando(true)
    const { error } = await supabase.from('turno').insert({
      negocio_id: negocio.id,
      servicio_id: sel.servicio.id,
      staff_id: sel.barbero.id,
      fecha: sel.fecha,
      hora: sel.hora + ':00',
      cliente_nombre: `${nombre.trim()} ${tel ? '· '+tel : ''}`,
      estado: 'pendiente',
      pago_estado: 'pendiente'
    })
    if (!error) setExito(true)
    setConfirmando(false)
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black italic text-white animate-pulse">Cargando experiencia...</div>
  if (!negocio) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Negocio no encontrado</div>
  if (exito) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 text-center">
      <div className="w-24 h-24 rounded-full border-4 mb-8 flex items-center justify-center text-4xl" style={{borderColor: colorP, color: colorP, boxShadow: `0 0 40px ${colorP}40`}}>✓</div>
      <h2 className="text-5xl font-black uppercase italic italic tracking-tighter mb-4">¡Turno Reservado!</h2>
      <p className="text-slate-400 mb-8 max-w-xs">Te esperamos en <span className="text-white font-bold">{negocio.nombre}</span> el {sel.fecha} a las {sel.hora}hs.</p>
      <button onClick={() => window.location.reload()} className="px-10 py-4 bg-white text-black font-black uppercase italic rounded-2xl hover:scale-105 transition-transform">Volver</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-20">
      <div className="max-w-md mx-auto px-6">
        <header className="py-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-[2rem] border-2 flex items-center justify-center text-3xl font-black mb-4" style={{borderColor: colorP + '40', background: colorP + '10', color: colorP}}>{negocio.nombre[0]}</div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">{negocio.nombre}</h1>
          <div className="h-1 w-20 rounded-full mt-4 bg-white/10"><div className="h-full bg-white transition-all duration-500" style={{width: (paso/3 * 100) + '%'}} /></div>
        </header>

        {paso === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Seleccioná un servicio</h2>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({...sel, servicio: s}); setPaso(2) }} className="w-full group bg-white/5 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center hover:bg-white/10 hover:border-white/20 transition-all">
                <div className="text-left"><p className="font-black italic uppercase text-lg group-hover:text-emerald-400 transition-colors">{s.nombre}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{s.duracion} MIN</p></div>
                <div className="text-right"><p className="text-2xl font-black italic" style={{color: colorP}}>${s.precio}</p></div>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">¿Quién te atiende?</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {staffList.map(st => (
                  <button key={st.id} onClick={() => setSel({...sel, barbero: st})} className={`flex-shrink-0 w-32 p-6 rounded-[2.5rem] border transition-all ${sel.barbero?.id === st.id ? 'bg-white text-black' : 'bg-white/5 border-white/5'}`} style={sel.barbero?.id === st.id ? {borderColor: colorP} : {}}>
                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl ${sel.barbero?.id === st.id ? 'bg-black text-white' : 'bg-white/10'}`} style={sel.barbero?.id === st.id ? {color: colorP} : {}}>{st.nombre[0]}</div>
                    <p className="text-[10px] font-black uppercase truncate">{st.nombre}</p>
                  </button>
                ))}
              </div>
            </section>

            {sel.barbero && (
              <section className="animate-in fade-in slide-in-from-top-4">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Elegí el día</h2>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {[0,1,2,3,4,5,6].map(i => {
                    const d = new Date(); d.setDate(d.getDate() + i); const iso = d.toISOString().split('T')[0]
                    const act = sel.fecha === iso
                    return (
                      <button key={iso} onClick={() => { setSel({...sel, fecha: iso}); setSel(prev => ({...prev, hora: ''})) }} className={`flex-shrink-0 w-16 h-24 rounded-2xl border flex flex-col items-center justify-center transition-all ${act ? 'bg-white text-black' : 'bg-white/5 border-white/5'}`} style={act ? {borderColor: colorP} : {}}>
                        <p className="text-[8px] font-black uppercase mb-1">{d.toLocaleDateString('es-ES', {weekday:'short'})}</p>
                        <p className="text-2xl font-black">{d.getDate()}</p>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {sel.fecha && (
              <section className="animate-in fade-in slide-in-from-top-4">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Horarios disponibles</h2>
                {horasDisponibles.length === 0 ? <p className="text-slate-600 italic text-sm">No hay turnos para este día.</p> : (
                  <div className="grid grid-cols-4 gap-2">
                    {horasDisponibles.map(h => (
                      <button key={h} onClick={() => setSel({...sel, hora: h})} className={`py-4 rounded-xl text-xs font-black transition-all ${sel.hora === h ? 'bg-white text-black' : 'bg-white/5 border-white/10 hover:border-white/30'}`} style={sel.hora === h ? {backgroundColor: colorP} : {}}>{h}</button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {sel.hora && <button onClick={() => setPaso(3)} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg text-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl" style={{backgroundColor: colorP}}>Continuar reserva</button>}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-8 animate-in zoom-in-95">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black uppercase text-slate-600 hover:text-white">← Volver</button>
            <div className="bg-white/5 border border-white/5 rounded-[3rem] p-10 space-y-6">
              <div className="text-center pb-6 border-b border-white/5">
                 <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Resumen del turno</p>
                 <p className="text-3xl font-black italic uppercase" style={{color: colorP}}>{sel.servicio?.nombre}</p>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-600">Con</span><span className="font-black uppercase">{sel.barbero?.nombre}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-600">Fecha</span><span className="font-black uppercase">{sel.fecha} · {sel.hora} HS</span></div>
                 <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-slate-600">Total</span><span className="text-xl font-black" style={{color: colorP}}>${sel.servicio?.precio}</span></div>
              </div>
            </div>
            <FormConfirmar onConfirmar={handleConfirmar} colorP={colorP} loading={confirmando} />
          </div>
        )}
      </div>
    </div>
  )
}

function FormConfirmar({ onConfirmar, colorP, loading }: any) {
  const [n, setN] = useState(''); const [t, setT] = useState('')
  return (
    <div className="space-y-4">
      <input type="text" placeholder="TU NOMBRE Y APELLIDO" value={n} onChange={e => setN(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black uppercase outline-none focus:border-white/30 transition-all" />
      <input type="tel" placeholder="CELULAR (OPCIONAL)" value={t} onChange={e => setT(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black uppercase outline-none focus:border-white/30 transition-all" />
      <button onClick={() => onConfirmar(n, t)} disabled={loading || !n.trim()} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg text-black transition-all disabled:opacity-50" style={{backgroundColor: colorP}}>{loading ? 'PROCESANDO...' : 'CONFIRMAR AHORA'}</button>
    </div>
  )
}
