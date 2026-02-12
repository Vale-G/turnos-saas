'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function ReservaPublica() {
  const { slug } = useParams()
  const [negocio, setNegocio] = useState<any>(null)
  const [servicios, setServicios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black">CARGANDO...</div>
  if (!negocio) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Negocio no encontrado.</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-md mx-auto space-y-8 py-10">
        <div className="text-center space-y-4">
          {negocio.logo_url && <img src={negocio.logo_url} className="w-24 h-24 rounded-3xl mx-auto shadow-2xl" />}
          <h1 className="text-3xl font-black uppercase italic tracking-tighter" style={{ color: negocio.color_primario }}>{negocio.nombre}</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Reserva tu turno online</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase text-slate-400 ml-1">1. Elegí tu servicio</h2>
          <div className="grid gap-3">
            {servicios.map(s => (
              <button key={s.id} className="w-full bg-slate-900 p-5 rounded-3xl border border-slate-800 flex justify-between items-center hover:scale-[1.02] transition-transform text-left group">
                <div>
                  <p className="font-bold text-lg">{s.nombre}</p>
                  <p className="text-xs text-slate-500 uppercase font-black">{s.duracion} min</p>
                </div>
                <span className="font-black text-xl" style={{ color: negocio.color_primario }}>${s.precio}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
