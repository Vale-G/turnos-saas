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
    if (!datos.nombre || !datos.whatsapp) return alert("Completa tus datos")
    
    // Insertamos el turno
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      fecha: new Date().toISOString().split('T')[0],
      hora: '12:00'
    }])

    if (error) {
      console.error("DETALLE DEL ERROR:", error)
      alert(`Error técnico: ${error.message}. Revisa la consola (F12)`)
    } else {
      setConfirmado(true)
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">CONECTANDO A BARBUCHO...</div>
  
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">✅</div>
      <h1 className="text-4xl font-black uppercase italic tracking-tighter">¡Turno Confirmado!</h1>
      <p className="text-slate-400 mt-4 font-bold uppercase text-[10px] tracking-[0.2em]">Ya podés cerrar esta ventana</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-md mx-auto py-10 space-y-8">
        <div className="text-center space-y-4">
          {negocio?.logo_url && <img src={negocio.logo_url} className="w-24 h-24 rounded-[32px] mx-auto shadow-2xl border border-slate-800" />}
          <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: negocio?.color_primario || '#fff' }}>{negocio?.nombre}</h1>
        </div>

        {paso === 1 ? (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Elegí un servicio</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} 
                className="w-full bg-slate-900 p-6 rounded-[32px] border border-slate-800 flex justify-between items-center active:scale-95 transition-all shadow-xl">
                <span className="font-bold text-lg">{s.nombre}</span>
                <span className="font-black text-xl" style={{ color: negocio?.color_primario }}>${s.precio}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6 bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tus datos para: {seleccion.nombre}</p>
              <input placeholder="Tu Nombre Completo" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 outline-none focus:border-slate-600 transition-all text-white font-bold" />
              <input placeholder="WhatsApp (Sin 0 ni 15)" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 outline-none focus:border-slate-600 transition-all text-white font-mono" />
            </div>
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-lg shadow-lg active:scale-95 transition-all" style={{ backgroundColor: negocio?.color_primario || '#10b981', color: '#000' }}>
              Reservar Ahora
            </button>
            <button onClick={() => setPaso(1)} className="w-full text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Volver atrás</button>
          </div>
        )}
      </div>
    </div>
  )
}
