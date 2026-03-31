'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

export default function CancelarTurnoPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [turno, setTurno] = useState<any>(null)
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [yaCancelado, setYaCancelado] = useState(false)

  useEffect(() => {
    async function cargarTurno() {
      if (!id) return
      // Buscamos el turno y nos traemos también los datos del negocio y servicio
      const { data, error } = await supabase
        .from('turno')
        .select('*, negocio(*), servicio(nombre)')
        .eq('id', id)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setTurno(data)
      setNegocio(data.negocio)
      if (data.estado === 'cancelado') {
        setYaCancelado(true)
      }
      setLoading(false)
    }
    cargarTurno()
  }, [id])

  const confirmarCancelacion = async () => {
    setCancelando(true)
    const { error } = await supabase
      .from('turno')
      .update({ estado: 'cancelado' })
      .eq('id', id)

    setCancelando(false)
    if (error) {
      toast.error('Hubo un error al cancelar. Intentá nuevamente.')
    } else {
      setYaCancelado(true)
      toast.success('Turno cancelado correctamente')
    }
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white">BUSCANDO TURNO...</div>
  
  if (!turno) return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-3xl font-black uppercase italic mb-2">Turno no encontrado</h1>
      <p className="text-slate-500 font-bold text-sm">El link puede estar roto o el turno fue eliminado.</p>
    </div>
  )

  const colorP = getThemeColor(negocio?.tema)
  const nombreCliente = turno.cliente_nombre?.split('·')[0] || 'Cliente'

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[3rem] p-10 text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95">
        
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20" style={{ backgroundColor: yaCancelado ? '#ef4444' : colorP }} />

        {/* Cabecera del Local */}
        {negocio?.logo_url ? (
          <img src={negocio.logo_url} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6 border border-white/10 shadow-lg" alt="Logo" />
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl mx-auto mb-6 border border-white/10" style={{ background: colorP + '20', color: colorP }}>
            {negocio?.nombre[0]}
          </div>
        )}

        {yaCancelado ? (
          <div className="animate-in fade-in">
             <div className="w-24 h-24 rounded-full bg-rose-500/10 border-4 border-rose-500/30 text-rose-500 mx-auto mb-6 flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(244,63,94,0.2)]">
               ✕
             </div>
             <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Turno Cancelado</h2>
             <p className="text-slate-400 text-sm font-medium mb-8">El lugar ya fue liberado en la agenda.</p>
             <button onClick={() => router.push(`/reservar/${negocio?.slug}`)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 border border-white/10 px-6 py-3 rounded-xl hover:bg-white/5 transition-all">
               Volver a reservar
             </button>
          </div>
        ) : (
          <div className="animate-in fade-in">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Hola, {nombreCliente}</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">¿Querés cancelar este turno?</p>

            <div className="bg-black/50 border border-white/5 rounded-3xl p-6 mb-8 text-left space-y-3">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Servicio</p>
                <p className="text-sm font-black uppercase italic text-white">{turno.servicio?.nombre}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Fecha</p>
                  <p className="text-sm font-black uppercase text-white">{turno.fecha}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Hora</p>
                  <p className="text-sm font-black uppercase text-white">{turno.hora.slice(0, 5)}</p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-bold mb-6">
              Al cancelar, este horario volverá a estar disponible para otra persona.
            </p>

            <div className="space-y-4">
              <button 
                onClick={confirmarCancelacion} 
                disabled={cancelando}
                className="w-full py-5 rounded-[2rem] font-black uppercase italic text-sm text-white bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all shadow-lg disabled:opacity-50"
              >
                {cancelando ? 'CANCELANDO...' : 'SÍ, CANCELAR TURNO'}
              </button>
              
              <button 
                onClick={() => window.history.back()} 
                className="w-full py-5 rounded-[2rem] font-black uppercase italic text-xs text-slate-400 bg-transparent hover:text-white transition-all"
              >
                No, me equivoqué
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
