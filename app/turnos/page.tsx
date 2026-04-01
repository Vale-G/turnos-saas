'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { buildWhatsAppConfirmacion } from '@/lib/whatsapp'

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }

export default function AgendaTurnosElite() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [negocio, setNegocio] = useState<any>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [fechaFiltro, setFechaFiltro] = useState(toBaDateStr(new Date()))
  const [vista, setVista] = useState<'dia' | 'semana'>('dia')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [turnoEditar, setTurnoEditar] = useState<any>(null)
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const [qrPago, setQrPago] = useState<string | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
      }
      if (nId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', nId).single()
        if (neg) { setNegocio(neg); setColorPrincipal(getThemeColor(neg.tema)) }
      } else { router.push('/onboarding') }
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id) return
    async function load() {
      setLoading(true)
      let query = supabase.from('turno').select('*, servicio(nombre, precio), staff(nombre)').eq('negocio_id', negocio.id).order('fecha').order('hora')
      
      if (vista === 'dia') {
        query = query.eq('fecha', fechaFiltro)
      } else {
        // Lógica de semana: desde la fecha filtro + 7 días
        const inicio = new Date(fechaFiltro + 'T12:00:00')
        const fin = new Date(inicio.getTime() + 7 * 86400000)
        query = query.gte('fecha', fechaFiltro).lte('fecha', toBaDateStr(fin))
      }

      const { data } = await query
      setTurnos(data || [])
      setLoading(false)
    }
    load()
  }, [negocio?.id, fechaFiltro, vista, reloadKey])

  // Unificamos la pantalla de carga al estilo oscuro
  if (loading && !turnos.length) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${colorPrincipal}40`, borderTopColor: colorPrincipal }}></div>
        <p className="font-black uppercase italic tracking-widest text-white animate-pulse">Cargando Agenda...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>Agenda</h1>
          </div>
          
          <div className="flex flex-wrap gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
            {/* Selector de Vista */}
            <div className="flex bg-black/40 rounded-xl p-1">
              <button onClick={() => setVista('dia')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${vista === 'dia' ? 'bg-white text-black' : 'text-slate-500'}`}>Día</button>
              <button onClick={() => setVista('semana')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${vista === 'semana' ? 'bg-white text-black' : 'text-slate-500'}`}>Semana</button>
            </div>
            <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="bg-transparent text-sm font-black uppercase outline-none px-4 [&::-webkit-calendar-picker-indicator]:invert cursor-pointer" />
          </div>
        </header>

        {/* Contenido de la agenda (igual que antes pero con soporte para vista semanal) */}
        <div className="space-y-4">
          {turnos.length === 0 ? (
            <p className="text-center py-20 text-slate-600 font-black text-xs uppercase tracking-widest">Sin Turnos para esta fecha</p>
          ) : (
            turnos.map(t => (
              <div key={t.id} className="rounded-[2.5rem] border border-white/10 bg-white/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <p className="text-2xl font-black italic w-16" style={{ color: colorPrincipal }}>{t.hora.slice(0, 5)}</p>
                  <div>
                    <p className="font-black uppercase text-base">{t.cliente_nombre.split('·')[0]} {vista === 'semana' && <span className="text-[10px] text-slate-500 ml-2">({t.fecha})</span>}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.servicio?.nombre} · {t.staff?.nombre}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setTurnoEditando(t.id); setQrPago(null) }} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-all">Gestionar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
