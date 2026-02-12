'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados del flujo
  const [paso, setPaso] = useState(1) 
  const [seleccion, setSeleccion] = useState<any>(null)
  const [hora, setHora] = useState('')
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '' })
  const [confirmado, setConfirmado] = useState(false)

  const horariosDisponibles = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ]

  useEffect(() => {
    async function load() {
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (neg) {
        setNegocio(neg)
        const { data: servs } = await supabase.from('Servicio').select('*').eq('negocio_id', neg.id)
        setServicios(servs || [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const confirmarTurno = async () => {
    if (!datos.nombre) return alert("Poné tu nombre")
    
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: hora
    }])

    if (!error) setConfirmado(true)
    else alert("Error al reservar")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic font-black">CARGANDO...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6 text-black shadow-[0_0_30px_rgba(16,185,129,0.4)]">✓</div>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">¡Turno Reservado!</h1>
      <p className="text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-widest">Te esperamos a las {hora} hs</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-8 py-10">
        <h1 className="text-4xl font-black uppercase italic text-center tracking-tighter" style={{ color: negocio?.color_primario }}>
          {negocio?.nombre}
        </h1>

        {/* PASO 1: SERVICIOS */}
        {paso === 1 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 text-center">1. Seleccioná el servicio</p>
            <div className="grid gap-3">
              {servicios.map(s => (
                <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} 
                  className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center active:scale-95 transition-all shadow-xl hover:border-slate-700">
                  <span className="font-bold text-lg">{s.nombre}</span>
                  <span className="font-black text-xl" style={{ color: negocio.color_primario }}>${s.precio}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: HORARIOS */}
        {paso === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">2. ¿A qué hora venís?</p>
            <div className="grid grid-cols-3 gap-2">
              {horariosDisponibles.map(h => (
                <button key={h} onClick={() => { setHora(h); setPaso(3); }} 
                  className="bg-slate-900 p-4 rounded-2xl border border-slate-800 font-bold hover:border-emerald-500 active:bg-emerald-500 active:text-black transition-all">
                  {h}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso(1)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest">Volver a servicios</button>
          </div>
        )}

        {/* PASO 3: DATOS FINALES */}
        {paso === 3 && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <p className="text-emerald-500 font-black text-2xl italic">{hora} HS</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{seleccion.nombre}</p>
            </div>
            <div className="space-y-3">
              <input placeholder="Tu Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-slate-600 transition-all text-white font-bold" />
              <input placeholder="Tu WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none focus:border-slate-600 transition-all text-white font-mono" />
            </div>
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-lg shadow-lg active:scale-95 transition-all" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>
              Confirmar Turno
            </button>
            <button onClick={() => setPaso(2)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest">Cambiar horario</button>
          </div>
        )}
      </div>
    </div>
  )
}
