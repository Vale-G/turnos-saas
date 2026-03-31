'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getThemeColor, TEMAS } from '@/lib/theme'
import { toast } from 'sonner'

export default function AjustesElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: neg } = await supabase.from('negocio').select('*').eq('owner_id', user.id).single()
      if (!neg) { router.push('/onboarding'); return }
      setNegocio(neg)
      setLoading(false)
    }
    init()
  }, [router])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('negocio').update({
      nombre: negocio.nombre,
      slug: negocio.slug,
      whatsapp: negocio.whatsapp,
      hora_apertura: negocio.hora_apertura,
      hora_cierre: negocio.hora_cierre,
      dias_laborales: negocio.dias_laborales,
      tema: negocio.tema
    }).eq('id', negocio.id)
    
    setGuardando(false)
    if (error) toast.error('Error al guardar: ' + error.message)
    else toast.success('Configuración guardada con éxito')
  }

  const toggleDia = (dia: number) => {
    const dias = negocio.dias_laborales || []
    if (dias.includes(dia)) {
      setNegocio({ ...negocio, dias_laborales: dias.filter((d: number) => d !== dia) })
    } else {
      setNegocio({ ...negocio, dias_laborales: [...dias, dia].sort() })
    }
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse tracking-tighter">CARGANDO AJUSTES...</div>

  const colorP = getThemeColor(negocio?.tema)
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Ajustes <span style={{ color: colorP }}>PRO</span></h1>
          </div>
        </header>

        <form onSubmit={guardar} className="space-y-8">
          
          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Información del Negocio</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Nombre visible</label>
                <input value={negocio.nombre} onChange={e => setNegocio({...negocio, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all" required />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">URL Personalizada (Slug)</label>
                <div className="flex bg-black/50 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-all">
                  <span className="p-5 text-xs font-black text-slate-600 bg-white/5">turnly.app/reservar/</span>
                  <input value={negocio.slug} onChange={e => setNegocio({...negocio, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} className="w-full bg-transparent p-5 text-xs font-black outline-none" required />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">WhatsApp de Contacto</label>
                <input value={negocio.whatsapp || ''} onChange={e => setNegocio({...negocio, whatsapp: e.target.value})} placeholder="EJ: 5491123456789" className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
              </div>
            </div>
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Horarios y Días Laborales</p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Apertura</label>
                <input type="time" value={negocio.hora_apertura?.slice(0,5)} onChange={e => setNegocio({...negocio, hora_apertura: e.target.value + ':00'})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" required />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Cierre</label>
                <input type="time" value={negocio.hora_cierre?.slice(0,5)} onChange={e => setNegocio({...negocio, hora_cierre: e.target.value + ':00'})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" required />
              </div>
            </div>
            <div>
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block">Días que abrís</label>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {diasSemana.map((dia, idx) => {
                   const activo = (negocio.dias_laborales || []).includes(idx)
                   return (
                     <button type="button" key={dia} onClick={() => toggleDia(idx)} className={`flex-shrink-0 w-16 h-16 rounded-2xl border font-black text-xs uppercase transition-all ${activo ? 'text-black border-transparent shadow-lg' : 'bg-black/50 border-white/10 hover:border-white/30 text-slate-500'}`} style={activo ? {backgroundColor: colorP} : {}}>
                       {dia}
                     </button>
                   )
                 })}
               </div>
            </div>
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Diseño y Marca</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(TEMAS).map(([key, obj]) => {
                // FIX: El color es obj.color
                const colorHex = (obj as any).color
                return (
                  <button type="button" key={key} onClick={() => setNegocio({...negocio, tema: key})} 
                    className={`w-14 h-14 rounded-full border-4 transition-all ${negocio.tema === key ? 'scale-110 shadow-2xl' : 'border-transparent hover:scale-105'}`} 
                    style={{ backgroundColor: colorHex, borderColor: negocio.tema === key ? 'white' : 'transparent', boxShadow: negocio.tema === key ? `0 0 20px ${colorHex}80` : 'none' }} 
                  />
                )
              })}
            </div>
          </div>

          <button type="submit" disabled={guardando} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl" style={{ backgroundColor: colorP }}>
            {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>

        </form>
      </div>
    </div>
  )
}
