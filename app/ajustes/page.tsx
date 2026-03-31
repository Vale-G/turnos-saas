'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getThemeColor, TEMAS } from '@/lib/theme'
import { toast } from 'sonner'
import Image from 'next/image'

export default function AjustesElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      nombre: negocio.nombre, slug: negocio.slug, whatsapp: negocio.whatsapp,
      hora_apertura: negocio.hora_apertura, hora_cierre: negocio.hora_cierre,
      dias_laborales: negocio.dias_laborales, tema: negocio.tema, mp_access_token: negocio.mp_access_token
    }).eq('id', negocio.id)
    setGuardando(false)
    if (error) toast.error('Error: ' + error.message)
    else toast.success('Configuración guardada')
  }

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${negocio.id}-${Math.random()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
    if (uploadError) { toast.error('Error al subir logo'); setSubiendoLogo(false); return }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    await supabase.from('negocio').update({ logo_url: publicUrl }).eq('id', negocio.id)
    
    setNegocio({...negocio, logo_url: publicUrl})
    toast.success('Logo actualizado con éxito')
    setSubiendoLogo(false)
  }

  const toggleDia = (dia: number) => {
    const dias = negocio.dias_laborales || []
    if (dias.includes(dia)) setNegocio({ ...negocio, dias_laborales: dias.filter((d: number) => d !== dia) })
    else setNegocio({ ...negocio, dias_laborales: [...dias, dia].sort() })
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse">CARGANDO...</div>

  const colorP = getThemeColor(negocio?.tema)
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white">← Dashboard</button>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">Ajustes <span style={{ color: colorP }}>PRO</span></h1>
        </header>

        <form onSubmit={guardar} className="space-y-8">
          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm flex flex-col md:flex-row items-center gap-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               {negocio.logo_url ? (
                 <img src={negocio.logo_url} alt="Logo" className="w-32 h-32 rounded-[2rem] object-contain bg-white/5 border border-white/10 p-2" />
               ) : (
                 <div className="w-32 h-32 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-4xl font-black" style={{color: colorP}}>{negocio.nombre?.[0]}</div>
               )}
               <div className="absolute inset-0 bg-black/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="text-[10px] font-black uppercase tracking-widest">{subiendoLogo ? 'SUBIENDO...' : 'CAMBIAR LOGO'}</span>
               </div>
               <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleSubirLogo} />
            </div>
            <div>
               <h3 className="text-2xl font-black uppercase italic mb-2">Marca White-Label</h3>
               <p className="text-slate-400 text-sm">Subí el logo de tu local. Se mostrará en tu Dashboard y en tu página de reservas pública.</p>
            </div>
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Nombre</label><input value={negocio.nombre} onChange={e => setNegocio({...negocio, nombre: e.target.value})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30" required /></div>
              <div><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">URL (Slug)</label><div className="flex bg-black/50 border border-white/10 rounded-2xl overflow-hidden"><span className="p-5 text-xs font-black text-slate-600 bg-white/5">/reservar/</span><input value={negocio.slug} onChange={e => setNegocio({...negocio, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} className="w-full bg-transparent p-5 text-xs font-black outline-none" required /></div></div>
              <div className="md:col-span-2"><label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">WhatsApp</label><input value={negocio.whatsapp || ''} onChange={e => setNegocio({...negocio, whatsapp: e.target.value})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none" /></div>
            </div>
          </div>

          <div className="bg-white/4 border border-blue-500/20 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">MercadoPago</p>
            <input type="password" value={negocio.mp_access_token || ''} onChange={e => setNegocio({...negocio, mp_access_token: e.target.value})} placeholder="APP_USR-..." className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-blue-500/50" />
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Apertura</label><input type="time" value={negocio.hora_apertura?.slice(0,5)} onChange={e => setNegocio({...negocio, hora_apertura: e.target.value + ':00'})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black [&::-webkit-calendar-picker-indicator]:invert" required /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Cierre</label><input type="time" value={negocio.hora_cierre?.slice(0,5)} onChange={e => setNegocio({...negocio, hora_cierre: e.target.value + ':00'})} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black [&::-webkit-calendar-picker-indicator]:invert" required /></div>
            </div>
            <div>
               <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">Días que abrís</label>
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 {diasSemana.map((dia, idx) => {
                   const activo = (negocio.dias_laborales || []).includes(idx)
                   return <button type="button" key={dia} onClick={() => toggleDia(idx)} className={`flex-shrink-0 w-16 h-16 rounded-2xl border font-black text-xs uppercase ${activo ? 'text-black border-transparent' : 'bg-black/50 border-white/10 text-slate-500'}`} style={activo ? {backgroundColor: colorP} : {}}>{dia}</button>
                 })}
               </div>
            </div>
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Color de Marca</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(TEMAS).map(([key, obj]) => {
                const colorHex = (obj as any).color
                return <button type="button" key={key} onClick={() => setNegocio({...negocio, tema: key})} className={`w-14 h-14 rounded-full border-4 transition-all ${negocio.tema === key ? 'scale-110 shadow-2xl' : 'border-transparent hover:scale-105 opacity-50 hover:opacity-100'}`} style={{ backgroundColor: colorHex, borderColor: negocio.tema === key ? 'white' : 'transparent', boxShadow: negocio.tema === key ? `0 0 20px ${colorHex}80` : 'none' }} />
              })}
            </div>
          </div>

          <button type="submit" disabled={guardando} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: colorP }}>
            {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
          </button>
        </form>
      </div>
    </div>
  )
}
