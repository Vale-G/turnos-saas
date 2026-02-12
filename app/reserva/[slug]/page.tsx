'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1) 
  const [seleccion, setSeleccion] = useState<any>(null)
  const [hora, setHora] = useState('')
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '' })
  const [confirmado, setConfirmado] = useState(false)
  const [horarios, setHorarios] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (neg) {
        setNegocio(neg)
        const { data: servs } = await supabase.from('Servicio').select('*').eq('negocio_id', neg.id)
        setServicios(servs || [])
        
        // GENERADOR ROBUSTO
        const hInicio = neg.hora_inicio ? parseInt(neg.hora_inicio.split(':')[0]) : 9
        const hFin = neg.hora_fin ? parseInt(neg.hora_fin.split(':')[0]) : 20
        
        const slots = []
        for (let h = hInicio; h < hFin; h++) {
          slots.push(`${h.toString().padStart(2, '0')}:00`)
          slots.push(`${h.toString().padStart(2, '0')}:30`)
        }
        setHorarios(slots)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const confirmarTurno = async () => {
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: hora
    }])
    if (!error) setConfirmado(true)
    else alert("Error al guardar reserva")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">CARGANDO...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6 text-black shadow-lg">✓</div>
      <h1 className="text-3xl font-black uppercase italic">¡Reservado!</h1>
      <p className="text-slate-500 mt-2 font-bold uppercase text-[10px]">Turno para las {hora} hs</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-8 py-10 text-center">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: negocio?.color_primario }}>{negocio?.nombre}</h1>

        {paso === 1 && (
          <div className="space-y-4 text-left">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] text-center">1. Seleccioná el servicio</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center active:scale-95 transition-all shadow-xl">
                <span className="font-bold text-lg">{s.nombre}</span>
                <span className="font-black text-xl text-emerald-500">${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">2. ¿A qué hora venís?</p>
            <div className="grid grid-cols-3 gap-2">
              {horarios.map(h => (
                <button key={h} onClick={() => { setHora(h); setPaso(3); }} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 font-bold hover:border-emerald-500 active:bg-emerald-500 active:text-black transition-all">
                  {h}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso(1)} className="w-full text-[10px] font-black text-slate-600 uppercase">Volver</button>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl">
            <p className="text-emerald-500 font-black text-2xl italic">{hora} HS</p>
            <input placeholder="Tu Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-bold" />
            <input placeholder="Tu WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-mono" />
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic text-lg" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>Confirmar Turno</button>
            <button onClick={() => setPaso(2)} className="w-full text-[10px] font-black text-slate-600 uppercase">Cambiar hora</button>
          </div>
        )}
      </div>
    </div>
  )
}
