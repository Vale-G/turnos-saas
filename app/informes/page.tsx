'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

export default function InformesElite() {
  const [loading, setLoading] = useState(true)
  const [tieneAcceso, setTieneAcceso] = useState(false)
  const [colorP, setColorP] = useState('#10b981')
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let negId = adm?.negocio_id
      
      if (!negId && adm?.role !== 'superadmin') {
         const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
         if (n) negId = n.id
      }

      if (negId) {
        const { data: neg } = await supabase.from('negocio').select('tema, suscripcion_tipo').eq('id', negId).single()
        if (neg) {
          setColorP(getThemeColor(neg.tema))
          // Lógica de acceso inquebrantable
          if (neg.suscripcion_tipo === 'pro' || neg.suscripcion_tipo === 'trial' || adm?.role === 'superadmin') {
            setTieneAcceso(true)
          }
        }
      } else if (adm?.role === 'superadmin') {
        setTieneAcceso(true)
      }
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase tracking-widest text-2xl">CARGANDO MÉTRICAS...</div>

  // PANTALLA DE BLOQUEO VISUAL
  if (!tieneAcceso) return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 flex items-center justify-center relative overflow-hidden">
       <button onClick={() => router.push('/dashboard')} className="absolute top-12 left-12 text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors z-20">← Volver al Dashboard</button>
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
       <div className="relative z-10 max-w-lg w-full bg-white/5 border border-white/10 p-12 rounded-[3.5rem] text-center backdrop-blur-xl shadow-2xl">
          <div className="w-24 h-24 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">🔒</div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">Función <span className="text-amber-400">PRO</span></h1>
          <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">Los informes estadísticos y el rendimiento del staff están reservados para locales con plan PRO Elite.</p>
          <button onClick={() => window.open('https://wa.me/5491123456789?text=Hola,%20quiero%20pasar%20mi%20local%20a%20PRO', '_blank')} className="w-full py-5 rounded-[2rem] bg-amber-400 text-black font-black uppercase italic text-sm hover:bg-amber-300 transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)] active:scale-95">Mejorar Plan Ahora</button>
       </div>
    </div>
  )

  // PANTALLA REAL (Si tiene acceso)
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto text-center py-20 animate-in fade-in zoom-in-95">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 hover:text-white transition-colors">← Volver al Dashboard</button>
        <div className="w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center text-4xl mb-8 border border-white/10 shadow-2xl" style={{ backgroundColor: colorP + '20', color: colorP }}>📊</div>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-4">Informes <span style={{color: colorP}}>PRO</span></h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">Métricas avanzadas, ticket promedio y rendimiento por staff próximamente en este módulo.</p>
      </div>
    </div>
  )
}
