'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getThemeColor, TEMAS } from '@/lib/theme'
import { toast } from 'sonner'

export default function AjustesElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [mpToken, setMpToken] = useState('')
  const [horaApertura, setHoraApertura] = useState('09:00')
  const [horaCierre, setHoraCierre] = useState('18:00')
  const [diasLaborales, setDiasLaborales] = useState<number[]>([1,2,3,4,5,6])
  const [tema, setTema] = useState('emerald')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: neg } = await supabase.from('negocio').select('*').eq('owner_id', user.id).single()
      if (!neg) { router.push('/onboarding'); return }
      
      setNegocio(neg)
      setNombre(neg.nombre || ''); setSlug(neg.slug || '')
      setWhatsapp(neg.whatsapp || ''); setEmailContacto(neg.email_contacto || '')
      setMpToken(neg.mp_access_token || ''); setTema(neg.tema || 'emerald')
      setHoraApertura(neg.hora_apertura?.slice(0,5) || '09:00')
      setHoraCierre(neg.hora_cierre?.slice(0,5) || '18:00')
      setDiasLaborales(neg.dias_laborales || [1,2,3,4,5,6])
      setLoading(false)
    }
    init()
  }, [router])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('negocio').update({
      nombre, slug, whatsapp, email_contacto: emailContacto, mp_access_token: mpToken,
      hora_apertura: horaApertura + ':00', hora_cierre: horaCierre + ':00',
      dias_laborales: diasLaborales, tema
    }).eq('id', negocio.id)
    
    setGuardando(false)
    if (error) toast.error('Error al guardar')
    else toast.success('Ajustes actualizados')
  }

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoLogo(true)
    const fileName = `${negocio.id}-${Math.random()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('logos').upload(fileName, file)
    if (error) { toast.error('Error al subir logo'); setSubiendoLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
    await supabase.from('negocio').update({ logo_url: publicUrl }).eq('id', negocio.id)
    setNegocio({...negocio, logo_url: publicUrl}); toast.success('Logo actualizado'); setSubiendoLogo(false)
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse">CARGANDO...</div>
  const colorP = getThemeColor(tema)

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white">← Dashboard</button>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">Ajustes <span style={{ color: colorP }}>PRO</span></h1>
        </header>

        <form onSubmit={guardar} className="space-y-8">
          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] flex flex-col md:flex-row items-center gap-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               {negocio.logo_url ? <img src={negocio.logo_url} alt="Logo" className="w-32 h-32 rounded-[2rem] object-contain bg-white/5 p-2" /> : <div className="w-32 h-32 rounded-[2rem] bg-white/5 flex items-center justify-center text-4xl font-black" style={{color: colorP}}>{nombre?.[0]}</div>}
               <div className="absolute inset-0 bg-black/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-[10px] font-black uppercase tracking-widest">{subiendoLogo ? 'SUBIENDO...' : 'LOGO'}</span></div>
               <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleSubirLogo} />
            </div>
            <div><h3 className="text-2xl font-black uppercase italic mb-2">Marca White-Label</h3><p className="text-slate-400 text-sm">Sube el logo de tu negocio para la página de reservas.</p></div>
          </div>

          <div className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Nombre</label><input value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none" required /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">URL</label><input value={slug} onChange={e=>setSlug(e.target.value.toLowerCase())} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none" required /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">WhatsApp</label><input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-emerald-400 mb-2 block">Email para Avisos</label><input type="email" value={emailContacto} onChange={e=>setEmailContacto(e.target.value)} placeholder="Recibir correos de nuevos turnos" className="w-full bg-black/50 border border-emerald-500/30 p-5 rounded-2xl text-xs font-black uppercase outline-none" /></div>
            </div>
          </div>

          <div className="bg-white/4 border border-blue-500/20 p-10 rounded-[3.5rem]"><p className="text-[10px] font-black uppercase text-blue-400 mb-4">Token MercadoPago</p><input type="password" value={mpToken} onChange={e=>setMpToken(e.target.value)} placeholder="APP_USR-..." className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none" /></div>

          <button type="submit" disabled={guardando} className="w-full py-6 rounded-[3rem] font-black uppercase italic text-xl text-black hover:scale-[1.02] transition-all" style={{ backgroundColor: colorP }}>{guardando ? 'GUARDANDO...' : 'GUARDAR'}</button>
        </form>
      </div>
    </div>
  )
}
