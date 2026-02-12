'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1) // 1: Servicio, 2: Horario, 3: Datos
  const [seleccion, setSeleccion] = useState<any>(null)
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '' })
  const [confirmado, setConfirmado] = useState(false)

  const horarios = ['09:00', '10:00', '11:00', '12:00', '16:00', '17:00', '18:00', '19:00']

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
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: horaSeleccionada
    }])
    if (!error) setConfirmado(true)
    else alert("Error al reservar")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">CARGANDO...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6 text-black">✓</div>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">¡Turno Agendado!</h1>
      <p className="text-slate-400 mt-2 font-bold uppercase text-[10px]">Te esperamos en {negocio.nombre} a las {horaSeleccionada}hs</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-3xl font-black uppercase italic text-center tracking-tighter" style={{ color: negocio?.color_primario }}>{negocio?.nombre}</h1>

        {paso === 1 && (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Seleccioná un servicio</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center shadow-xl hover:border-slate-600 transition-all">
                <span className="font-bold">{s.nombre}</span>
                <span className="font-black text-emerald-500">${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Elegí el horario para hoy</p>
            <div className="grid grid-cols-3 gap-3">
              {horarios.map(h => (
                <button key={h} onClick={() => { setHoraSeleccionada(h); setPaso(3); }} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 font-bold hover:border-emerald-500 transition-all text-white">
                  {h}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso(1)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest">Volver</button>
          </div>
        )}

        {paso === 3 && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-4 shadow-2xl">
            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Confirmá tus datos ({horaSeleccionada}hs)</p>
            <input placeholder="Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-bold" />
            <input placeholder="WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-mono" />
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>Confirmar Reserva</button>
            <button onClick={() => setPaso(2)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-widest">Cambiar Horario</button>
          </div>
        )}
      </div>
    </div>
  )
}
