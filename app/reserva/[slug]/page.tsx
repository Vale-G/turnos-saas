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
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
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

  // Filtrar los próximos 7 días que el negocio SÍ atiende
  const proximosDias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      full: d.toISOString().split('T')[0],
      label: i === 0 ? 'Hoy' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }),
      dayNum: d.getDay().toString()
    }
  }).filter(d => negocio?.dias_atencion?.split(',').includes(d.dayNum)).slice(0, 7)

  useEffect(() => {
    if (barbero && negocio && paso === 4) {
      async function checkAvailability() {
        const { data } = await supabase
          .from('Turno')
          .select('hora')
          .eq('negocio_id', negocio.id)
          .eq('barbero_nombre', barbero.nombre)
          .eq('fecha', fecha)
        
        const ocupados = data?.map(t => {
          const partes = t.hora.split(':')
          return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
        }) || []
        setTurnosOcupados(ocupados)
      }
      checkAvailability()
    }
  }, [barbero, negocio, fecha, paso])

  const horariosBase = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30']

  const confirmarTurno = async () => {
    const { error } = await supabase.from('Turno').insert([{
      cliente_nombre: datos.nombre,
      cliente_whatsapp: datos.whatsapp,
      servicio_id: seleccion.id,
      negocio_id: negocio.id,
      barbero_nombre: barbero.nombre,
      fecha: fecha,
      hora: hora
    }])
    if (!error) setConfirmado(true)
    else alert("Error: Probablemente este turno ya fue tomado. Intenta con otro horario.")
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white italic">Cargando...</div>
  if (confirmado) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center text-emerald-500 font-black italic">
      <h1 className="text-4xl uppercase">¡LISTO!</h1>
      <p className="text-white mt-2">Te esperamos el {fecha} a las {hora} hs.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-md mx-auto space-y-8 py-10">
        <h1 className="text-4xl font-black uppercase italic text-center text-emerald-500 tracking-tighter">{negocio?.nombre}</h1>

        {paso === 1 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">1. SERVICIO</p>
            {servicios.map(s => (
              <button key={s.id} onClick={() => { setSeleccion(s); setPaso(2); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center active:scale-95 transition-all">
                <span className="font-bold">{s.nombre}</span>
                <span className="font-black text-emerald-500">${s.precio}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">2. DÍA</p>
            <div className="grid grid-cols-2 gap-3">
              {proximosDias.map(d => (
                <button key={d.full} onClick={() => { setFecha(d.full); setPaso(3); }} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 font-bold uppercase text-xs">
                  {d.label}
                </button>
              ))}
            </div>
            <button onClick={() => setPaso(1)} className="w-full text-[10px] text-slate-600 uppercase font-black">Atrás</button>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">3. BARBERO</p>
            {staff.map(st => (
              <button key={st.id} onClick={() => { setBarbero(st); setPaso(4); }} className="w-full bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-black uppercase">{st.nombre[0]}</div>
                <span className="font-bold">{st.nombre}</span>
              </button>
            ))}
          </div>
        )}

        {paso === 4 && (
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">4. HORARIO</p>
            <div className="grid grid-cols-3 gap-2">
              {horariosBase.map(h => {
                const ocupado = turnosOcupados.includes(h);
                return (
                  <button key={h} disabled={ocupado} onClick={() => { setHora(h); setPaso(5); }} 
                    className={`p-4 rounded-2xl border font-bold ${ocupado ? 'opacity-10 border-transparent' : 'bg-slate-900 border-slate-800 text-white'}`}>
                    {h}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {paso === 5 && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 space-y-6">
            <div className="text-center font-black italic">
              <p className="text-emerald-500 text-2xl">{hora} HS</p>
              <p className="text-slate-500 text-[10px] uppercase">Día: {fecha} | {barbero?.nombre}</p>
            </div>
            <input placeholder="Nombre" value={datos.nombre} onChange={e => setDatos({...datos, nombre: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white font-bold" />
            <input placeholder="WhatsApp" value={datos.whatsapp} onChange={e => setDatos({...datos, whatsapp: e.target.value})} className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 text-white" />
            <button onClick={confirmarTurno} className="w-full py-5 rounded-2xl font-black bg-emerald-500 text-black uppercase italic">Confirmar Reserva</button>
          </div>
        )}
      </div>
    </div>
  )
}
