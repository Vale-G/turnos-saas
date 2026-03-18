'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPro() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [misTurnos, setMisTurnos] = useState<any[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1) 
  const [user, setUser] = useState<any>(null)
  const [sel, setSel] = useState({ servicio: null as any, barbero: null as any, fecha: '', hora: '' })

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        const { data: tuns } = await supabase.from('Turno').select('*, Servicio(nombre)').eq('cliente_id', authUser.id).order('fecha', { ascending: false }).limit(3)
        setMisTurnos(tuns || [])
      }
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (!neg) return setLoading(false)
      setNegocio(neg)
      const [ser, stf] = await Promise.all([
        supabase.from('Servicio').select('*').eq('negocio_id', neg.id),
        supabase.from('Staff').select('*').eq('negocio_id', neg.id).eq('activo', true)
      ])
      setServicios(ser.data || []); setStaff(stf.data || []); setLoading(false)
    }
    init()
  }, [slug])

  useEffect(() => {
    if (sel.barbero && sel.fecha) {
      supabase.from('Turno').select('hora').eq('staff_id', sel.barbero.id).eq('fecha', sel.fecha).not('estado', 'eq', 'cancelado')
      .then(({ data }) => { if (data) setOcupados(data.map(t => t.hora.slice(0, 5))) })
    }
  }, [sel.barbero, sel.fecha])

  const loginGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })

  const generarHoras = () => {
    if (!negocio || !sel.servicio) return []
    const lista = []; let act = negocio.hora_apertura; const cie = negocio.hora_cierre
    while (act < cie) {
      const hF = act.slice(0, 5)
      if (!ocupados.includes(hF)) lista.push(hF)
      let [h, m] = act.split(':').map(Number); m += sel.servicio.duracion
      if (m >= 60) { h += Math.floor(m/60); m %= 60 }; act = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:00`
    }
    return lista
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-emerald-500 uppercase">Barbucho Pro...</div>

  const colorP = { emerald:'#10b981', rose:'#f43f5e', blue:'#3b82f6', amber:'#f59e0b' }[negocio?.tema as string || 'emerald']

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans selection:bg-emerald-500">
      <div className="max-w-md mx-auto">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-10 bg-slate-900/40 p-4 rounded-[2rem] border border-white/5">
          <span className="font-black uppercase italic text-xs" style={{ color: colorP }}>{negocio.nombre}</span>
          {user && (
            <button onClick={() => setPaso(paso === 0 ? 1 : 0)} className="flex items-center gap-2">
              <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full border border-emerald-500" />
              <span className="text-[9px] font-black uppercase">{paso === 0 ? 'Cerrar' : 'Mis Turnos'}</span>
            </button>
          )}
        </header>

        {/* PASO 0: MIS TURNOS */}
        {paso === 0 && (
          <div className="space-y-4 animate-in fade-in zoom-in">
             <h2 className="text-xl font-black uppercase italic text-center mb-6" style={{ color: colorP }}>Tu Historial</h2>
             {misTurnos.map(t => (
                <div key={t.id} className="bg-slate-900/60 border-l-4 p-5 rounded-2xl flex justify-between items-center" style={{ borderColor: colorP }}>
                   <div><p className="font-black uppercase text-sm">{t.Servicio?.nombre}</p><p className="text-[10px] text-slate-500 font-bold">{t.fecha} - {t.hora.slice(0,5)}</p></div>
                   <span className="text-[9px] font-black uppercase px-2 py-1 bg-white/5 rounded text-slate-400">{t.estado}</span>
                </div>
             ))}
             <button onClick={() => setPaso(1)} className="w-full py-4 bg-white text-black font-black uppercase italic rounded-2xl text-xs">Nueva Reserva</button>
          </div>
        )}

        {/* PASO 1: SERVICIOS */}
        {paso === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center mb-6 tracking-widest italic">— Elegí Servicio —</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSel({...sel, servicio: s}); setPaso(2) }} className="w-full bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center active:scale-95 transition-all">
                <div className="text-left"><h3 className="font-black uppercase italic text-lg">{s.nombre}</h3><p className="text-slate-500 text-[10px]">{s.duracion} MIN</p></div>
                <span className="text-xl font-black italic" style={{ color: colorP }}>${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {/* PASO 2: STAFF */}
        {paso === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setPaso(1)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            <div className="grid grid-cols-2 gap-4">
              {staff.map(p => (
                <button key={p.id} onClick={() => { setSel({...sel, barbero: p}); setPaso(3) }} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] text-center active:scale-95">
                  <div className="w-12 h-12 bg-white/5 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl border border-white/10" style={{ color: colorP }}>{p.nombre[0]}</div>
                  <h3 className="font-black uppercase italic text-xs">{p.nombre}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: DÍA */}
        {paso === 3 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={() => setPaso(2)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            {[0,1,2,3,4,5,6].map(o => {
              const d = new Date(); d.setDate(d.getDate() + o); const iso = d.toISOString().split('T')[0]
              const lab = negocio?.dias_laborales?.includes(new Date(iso + 'T00:00:00').getDay())
              return (
                <button key={iso} disabled={!lab} onClick={() => { setSel({...sel, fecha: iso}); setPaso(4) }} className={`w-full p-6 rounded-[2.5rem] border flex justify-between items-center transition-all ${!lab ? 'opacity-20 grayscale border-transparent' : 'bg-slate-900/40 border-white/5 active:scale-95'}`}>
                   <span className="font-black italic uppercase text-lg">{d.getDate()} de {d.toLocaleDateString('es-ES',{month:'short'})}</span>
                   {lab && <span style={{ color: colorP }} className="font-black italic text-[10px]">VER HORAS</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* PASO 4: HORA Y LOGIN OBLIGATORIO */}
        {paso === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
            <button onClick={() => setPaso(3)} className="text-[10px] font-black text-slate-500 italic">← Volver</button>
            <div className="grid grid-cols-3 gap-2">
              {generarHoras().map(h => (
                <button key={h} onClick={() => setSel({...sel, hora: h})} className={`py-4 rounded-xl font-black text-xs border ${sel.hora === h ? 'bg-white text-black border-white' : 'bg-slate-900/40 border-white/5'}`}>{h}</button>
              ))}
            </div>
            
            {sel.hora && (
              <div className="mt-8 bg-slate-900/80 p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                {!user ? (
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase text-emerald-500 italic">Casi listo! Necesitás identificarte:</p>
                    <button onClick={loginGoogle} className="w-full py-5 bg-white text-black font-black uppercase italic rounded-2xl flex items-center justify-center gap-3">
                      <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                      Continuar con Google
                    </button>
                  </div>
                ) : (
                  <button onClick={async () => {
                    setLoading(true)
                    await supabase.from('Turno').insert([{ negocio_id: negocio.id, servicio_id: sel.servicio.id, staff_id: sel.barbero.id, fecha: sel.fecha, hora: sel.hora+':00', cliente_nombre: user.user_metadata.full_name, cliente_id: user.id, estado: 'pendiente' }])
                    setLoading(false); setPaso(5)
                  }} className="w-full py-6 rounded-[2rem] font-black uppercase italic text-lg shadow-xl" style={{ backgroundColor: colorP, color: 'black' }}>Confirmar Turno</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 5: ÉXITO */}
        {paso === 5 && (
          <div className="text-center py-20 animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-500 text-black rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_50px_rgba(16,185,129,0.3)]">✓</div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">¡Turno Confirmado!</h2>
            <p className="text-slate-500 font-bold uppercase text-[9px] mt-2">Aparecerá en "Mis Turnos"</p>
            <button onClick={() => window.location.reload()} className="mt-12 text-[10px] font-black uppercase text-slate-700 border-b border-slate-900 pb-1">Finalizar</button>
          </div>
        )}

      </div>
    </div>
  )
}