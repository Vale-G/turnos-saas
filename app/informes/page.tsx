'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

type StatTurno = {
  fecha: string; estado: string; pago_estado: string | null; pago_tipo: string | null
  servicio?: { nombre: string; precio: number }
  staff?: { nombre: string }
}

export default function Informes() {
  const [turnos, setTurnos] = useState<StatTurno[]>([])
  const [loading, setLoading] = useState(true)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [esPro, setEsPro] = useState(false)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('30d')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: neg } = await supabase.from('negocio').select('id, tema, suscripcion_tipo').eq('owner_id', user.id).single()
      if (!neg) { router.push('/onboarding'); return }
      if (neg.suscripcion_tipo !== 'pro') { router.push('/dashboard'); return }
      setNegocioId(neg.id); setEsPro(true); setColorPrincipal(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocioId) return
    async function cargar() {
      setLoading(true)
      const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
      const desde = new Date(); desde.setDate(desde.getDate() - dias)
      const { data } = await supabase.from('turno').select('fecha, estado, pago_estado, pago_tipo, servicio(nombre, precio), staff(nombre)')
        .eq('negocio_id', negocioId).gte('fecha', desde.toISOString().split('T')[0]).order('fecha', { ascending: true })
      setTurnos((data as any[]) ?? []); setLoading(false)
    }
    cargar()
  }, [negocioId, periodo])

  const cobrados = turnos.filter(t => t.pago_estado === 'cobrado')
  const totalIngreso = cobrados.reduce((s, t) => s + (t.servicio?.precio ?? 0), 0)
  const ticketPromedio = cobrados.length ? totalIngreso / cobrados.length : 0

  const porServicio: Record<string, number> = {}
  turnos.filter(t => t.estado !== 'cancelado').forEach(t => {
    const n = t.servicio?.nombre ?? 'Sin servicio'
    porServicio[n] = (porServicio[n] ?? 0) + 1
  })
  const rankingServicios = Object.entries(porServicio).sort((a,b) => b[1] - a[1]).slice(0,5)

  if (!esPro && !loading) return null

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase mb-2 block hover:text-white transition-colors">Volver</button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>Informes</h1>
            <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-full">PRO</span>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {['7d', '30d', '90d'].map(p => (
            <button key={p} onClick={() => setPeriodo(p as any)} className={'px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all ' + (periodo === p ? 'text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10')} style={periodo === p ? { backgroundColor: colorPrincipal } : {}}>{p}</button>
          ))}
        </div>

        {loading ? <div className="text-center py-20 text-slate-700 font-black italic animate-pulse">Analizando datos...</div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Ingresos</p>
                <p className="text-2xl font-black text-emerald-400">${totalIngreso.toLocaleString('es-AR')}</p>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Ticket Prom.</p>
                <p className="text-2xl font-black" style={{color: colorPrincipal}}>${Math.round(ticketPromedio).toLocaleString('es-AR')}</p>
              </div>
            </div>
            
            <div className="bg-white/4 border border-white/8 rounded-2xl p-6">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-4 tracking-widest">Servicios más pedidos</p>
              <div className="space-y-3">
                {rankingServicios.map(([nombre, cant]) => (
                  <div key={nombre} className="flex justify-between items-center text-sm">
                    <span className="font-bold">{nombre}</span>
                    <span className="text-slate-400 font-black">{cant} turnos</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
