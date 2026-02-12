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
    // Intentamos insertar el turno con la fecha de hoy
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: '16:00'
    }])

    if (!error) {
      setConfirmado(true)
    } else {
      console.error(error)
      alert("Error al reservar: " + error.message)
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic">Cargando Barbucho...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-black uppercase italic mb-4" style={{ color: negocio.color_primario }}>¡Listo!</h1>
      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Turno agendado correctamente</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-md mx-auto py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: negocio.color_primario }}>{negocio.nombre}</h1>
        </div>

        {paso === 1 ? (
          <div className="grid gap-3">
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} 
                className="w-full bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center">
                <span className="font-bold text-lg">{s.nombre}</span>
                <span className="font-black text-xl" style={{ color: negocio.color_primario }}>${s.precio}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl">
            <input placeholder="Tu Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none" required />
            <input placeholder="Tu WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none" required />
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>
              Confirmar Turno
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
