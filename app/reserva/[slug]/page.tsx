'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estado para el proceso de reserva
  const [paso, setPaso] = useState(1) // 1: Servicio, 2: Datos
  const [seleccion, setSeleccion] = useState<any>(null)
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '' })
  const [confirmado, setConfirmado] = useState(false)

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
      fecha: new Date().toISOString().split('T')[0], // Turno para hoy por ahora
      hora: '10:00', // Hardcoded para prueba
    }])

    if (!error) setConfirmado(true)
    else alert("Error al reservar")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic font-black">Sincronizando...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6">✅</div>
      <h1 className="text-3xl font-black uppercase italic">¡Turno Reservado!</h1>
      <p className="text-slate-500 mt-2 font-bold">Te esperamos en {negocio.nombre}.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-md mx-auto py-10 space-y-8">
        <div className="text-center">
          {negocio.logo_url && <img src={negocio.logo_url} className="w-20 h-20 rounded-2xl mx-auto mb-4" />}
          <h1 className="text-2xl font-black uppercase italic" style={{ color: negocio.color_primario }}>{negocio.nombre}</h1>
        </div>

        {paso === 1 ? (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selecciona un servicio</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} 
                className="w-full bg-slate-900 p-5 rounded-3xl border border-slate-800 flex justify-between items-center hover:border-slate-500 transition-all">
                <span className="font-bold">{s.nombre}</span>
                <span className="font-black text-emerald-500">${s.precio}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6 bg-slate-900 p-6 rounded-3xl border border-slate-800">
            <p className="text-xs font-black uppercase text-slate-500">Tus datos para: {seleccion.nombre}</p>
            <input placeholder="Tu Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none" />
            <input placeholder="Tu WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none" />
            <button onClick={confirmarTurno} className="w-full py-4 rounded-2xl font-black uppercase italic" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>
              Confirmar Reserva
            </button>
            <button onClick={() => setPaso(1)} className="w-full text-xs font-bold text-slate-500 uppercase">Volver atrás</button>
          </div>
        )}
      </div>
    </div>
  )
}
