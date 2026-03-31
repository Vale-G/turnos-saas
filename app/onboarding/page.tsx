'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor, TEMAS } from '@/lib/theme'
import { toast } from 'sonner'

export default function OnboardingElite() {
  const [paso, setPaso] = useState(1)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [diasTrial, setDiasTrial] = useState(14)
  
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [tema, setTema] = useState('emerald')
  const [apertura, setApertura] = useState('09:00')
  const [cierre, setCierre] = useState('20:00')

  const router = useRouter()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/registro-negocio')
      setUser(user)
      
      const { data: neg } = await supabase.from('negocio').select('id').eq('owner_id', user.id).single()
      if (neg) return router.push('/dashboard')
      
      // Cargamos cuántos días de trial dar desde la base de datos
      const { data: cfg } = await supabase.from('config').select('valor').eq('clave', 'dias_trial').single()
      if (cfg) setDiasTrial(Number(cfg.valor))

      setLoading(false)
    }
    check()
  }, [router])

  useEffect(() => {
    if (paso === 1 && nombre) {
      setSlug(nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'))
    }
  }, [nombre, paso])

  const crearNegocio = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const trialHasta = new Date()
    trialHasta.setDate(trialHasta.getDate() + diasTrial)

    const { data, error } = await supabase.from('negocio').insert({
      owner_id: user.id,
      nombre,
      slug,
      whatsapp,
      tema,
      hora_apertura: apertura + ':00',
      hora_cierre: cierre + ':00',
      suscripcion_tipo: 'trial',
      trial_hasta: trialHasta.toISOString().split('T')[0]
    }).select('id').single()

    if (error) {
      toast.error('Error al crear tu negocio: ' + error.message)
      setGuardando(false)
      return
    }

    await supabase.from('adminrol').insert({ user_id: user.id, role: 'owner', negocio_id: data.id })

    toast.success('¡Negocio creado con éxito! Bienvenido a Turnly 🚀')
    router.push('/dashboard')
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse tracking-tighter">PREPARANDO ENTORNO...</div>

  const colorP = getThemeColor(tema)

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-[150px] opacity-10 transition-colors duration-1000 pointer-events-none" style={{ backgroundColor: colorP }} />

      <div className="w-full max-w-xl relative z-10">
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Bienvenido a <span style={{color: colorP}} className="transition-colors duration-500">Turnly</span></h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Configuración Inicial · Paso {paso} de 3</p>
          <div className="flex gap-2 mt-6 justify-center">
            <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${paso >= 1 ? 'bg-white' : 'bg-white/10'}`} />
            <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${paso >= 2 ? 'bg-white' : 'bg-white/10'}`} />
            <div className={`h-1.5 w-12 rounded-full transition-all duration-500 ${paso >= 3 ? 'bg-white' : 'bg-white/10'}`} />
          </div>
        </div>

        <form onSubmit={paso === 3 ? crearNegocio : (e) => { e.preventDefault(); setPaso(paso + 1) }} className="bg-white/5 border border-white/10 p-10 md:p-12 rounded-[3.5rem] backdrop-blur-md shadow-2xl relative overflow-hidden min-h-[400px] flex flex-col justify-between">
          
          {paso === 1 && (
            <div className="animate-in slide-in-from-right-8 duration-500 space-y-6">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8">Tu Marca</h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Nombre de tu Negocio</label>
                <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)} placeholder="EJ: F&V BARBERSHOP" required className="w-full bg-black/50 border border-white/10 p-6 rounded-2xl text-sm font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Link Único de Reservas</label>
                <div className="flex items-center bg-black/50 border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/30 transition-all p-2">
                  <span className="pl-4 pr-2 text-xs font-black text-slate-600">turnly.app/reservar/</span>
                  <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required className="w-full bg-transparent py-4 pr-4 text-xs font-black outline-none text-white" />
                </div>
              </div>
            </div>
          )}

          {paso === 2 && (
            <div className="animate-in slide-in-from-right-8 duration-500 space-y-6">
              <button type="button" onClick={() => setPaso(1)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white mb-4 block">← Volver</button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8">Tus Reglas</h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">WhatsApp de Contacto (Opcional)</label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="EJ: 5491123456789" className="w-full bg-black/50 border border-white/10 p-6 rounded-2xl text-sm font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Para que tus clientes puedan hablarte directo.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Apertura</label>
                  <input type="time" value={apertura} onChange={e => setApertura(e.target.value)} required className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block">Cierre</label>
                  <input type="time" value={cierre} onChange={e => setCierre(e.target.value)} required className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-sm font-black outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
              </div>
            </div>
          )}

          {paso === 3 && (
            <div className="animate-in slide-in-from-right-8 duration-500 space-y-6">
              <button type="button" onClick={() => setPaso(2)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white mb-4 block">← Volver</button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-8">El Toque Final</h2>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block text-center">Elegí el color de tu marca</label>
                <div className="flex flex-wrap justify-center gap-4">
                  {Object.entries(TEMAS).map(([key, obj]) => {
                    const colorHex = (obj as any).color
                    return (
                      <button type="button" key={key} onClick={() => setTema(key)} 
                        className={`w-16 h-16 rounded-full border-4 transition-all duration-300 ${tema === key ? 'scale-110 shadow-2xl' : 'border-transparent hover:scale-105 opacity-50 hover:opacity-100'}`} 
                        style={{ backgroundColor: colorHex, borderColor: tema === key ? 'white' : 'transparent', boxShadow: tema === key ? `0 0 30px ${colorHex}80` : 'none' }} 
                      />
                    )
                  })}
                </div>
              </div>
              <div className="pt-8 text-center bg-black/30 p-6 rounded-[2rem] border border-white/5 mt-8">
                 <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-2">Resumen</p>
                 <p className="text-xl font-black uppercase italic tracking-tighter" style={{color: colorP}}>{nombre}</p>
                 <p className="text-xs text-slate-400 font-black mt-1">turnly.app/reservar/{slug}</p>
              </div>
            </div>
          )}

          <button type="submit" disabled={guardando || (paso === 1 && !nombre)} className={`w-full py-6 rounded-[2.5rem] font-black uppercase italic text-lg transition-all mt-10 shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${paso === 3 ? 'text-black' : 'bg-white text-black'}`} style={paso === 3 ? { backgroundColor: colorP } : {}}>
            {guardando ? 'CREANDO NEGOCIO...' : paso === 3 ? '¡LANZAR MI SAAS!' : 'CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
