'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  const [paso, setPaso] = useState(1) 
  const [seleccion, setSeleccion] = useState<any>(null)
  const [barbero, setBarbero] = useState<any>(null)
  const [hora, setHora] = useState('')
  const [datos, setDatos] = useState({ nombre: '', whatsapp: '' })
  const [confirmado, setConfirmado] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: neg } = await supabase.from('Negocio').select('*').eq('slug', slug).single()
      if (neg) {
        setNegocio(neg)
        const { data: servs } = await supabase.from('Servicio').select('*').eq('negocio_id', neg.id)
        const { data: stf } = await supabase.from('Staff').select('*').eq('negocio_id', neg.id)
        setServicios(servs || [])
        setStaff(stf || [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Cargar turnos ocupados cuando se elige barbero
  useEffect(() => {
    if (barbero && negocio) {
      async function checkAvailability() {
        const hoy = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('Turno')
          .select('hora')
          .eq('negocio_id', negocio.id)
          .eq('barbero_nombre', barbero.nombre)
          .eq('fecha', hoy)
        
        // Guardamos solo las horas (ej: ["10:00:00", "11:30:00"])
        setTurnosOcupados(data?.map(t => t.hora.slice(0, 5)) || [])
      }
      checkAvailability()
    }
  }, [barbero, negocio])

  const horariosBase = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30']

  const confirmarTurno = async () => {
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      barbero_nombre: barbero.nombre,
      fecha: new Date().toISOString().split('T')[0],
      hora: hora
    }])
    if (!error) setConfirmado(true)
    else alert("Error al reservar")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic">Cargando...</div>
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mb-6 text-black shadow-lg">✓</div>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">¡Turno Reservado!</h1>
      <p className="text-slate-500 mt-2 font-bold uppercase text-[10px]">Agendado con {barbero.nombre} a las {hora} hs</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-8 py-10">
        <h1 className="text-4xl font-black uppercase italic text-center tracking-tighter" style={{ color: negocio?.color_primario }}>{negocio?.nombre}</h1>

        {paso === 1 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">1. Elegí Servicio</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center shadow-xl">
                <span className="font-bold text-lg">{s.nombre}</span>
                <span className="font-black text-xl text-emerald-500">${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">2. ¿Quién te atiende?</p>
            {staff.map(st => (
              <button key={st.id} onClick={() => { setBarbero(st); setPaso(3); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-4 shadow-xl">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">👤</div>
                <span className="font-bold text-lg">{st.nombre}</span>
              </button>
            ))}
            <button onClick={() => setPaso(1)} className="w-full text-[10px] font-black text-slate-600 uppercase">Volver</button>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">3. ¿A qué hora?</p>
            <div className="grid grid-cols-3 gap-2">
              {horariosBase.map(h => {
                const estaOcupado = turnosOcupados.includes(h);
                return (
                  <button 
                    key={h} 
                    disabled={estaOcupado}
                    onClick={() => { setHora(h); setPaso(4); }} 
                    className={`p-4 rounded-2xl border font-bold transition-all ${
                      estaOcupado 
                      ? 'bg-slate-950 border-slate-900 text-slate-800 cursor-not-allowed opacity-50' 
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-500 text-white'
                    }`}
                  >
                    {h}
                    {estaOcupado && <span className="block text-[8px] uppercase">Ocupado</span>}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPaso(2)} className="w-full text-[10px] font-black text-slate-600 uppercase">Volver</button>
          </div>
        )}

        {paso === 4 && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl">
            <div className="text-center">
              <p className="text-emerald-500 font-black text-2xl italic uppercase tracking-tighter">{hora} HS</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Con {barbero.nombre}</p>
            </div>
            <div className="space-y-3">
              <input placeholder="Tu Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-bold" />
              <input placeholder="WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 outline-none text-white font-mono" />
            </div>
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black uppercase italic text-lg" style={{ backgroundColor: negocio.color_primario, color: '#000' }}>Confirmar Reserva</button>
          </div>
        )}
      </div>
    </div>
  )
}
