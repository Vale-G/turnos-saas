'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { brandConfig } from '@/config/brand'

export default function NegocioInactivoElite() {
  const router = useRouter()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-md w-full bg-white/5 border border-rose-500/20 p-12 rounded-[3.5rem] text-center backdrop-blur-md shadow-[0_0_50px_rgba(244,63,94,0.1)] relative z-10 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 shadow-inner">
          🔒
        </div>
        
        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4 text-white">Acceso <span className="text-rose-500">Bloqueado</span></h1>
        
        <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
          El período de prueba de tu negocio ha finalizado o tu suscripción se encuentra inactiva. Para recuperar el acceso a tu agenda y seguir recibiendo reservas, por favor renová tu plan.
        </p>

        <div className="space-y-4">
          <button onClick={() => window.open(`https://wa.me/5491123456789?text=${encodeURIComponent(`Hola, quiero renovar mi suscripcion de ${brandConfig.appName}`)}`, '_blank')} className="w-full py-5 rounded-[2rem] bg-rose-500 text-black font-black uppercase italic text-sm hover:bg-rose-400 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95">
            Contactar a Soporte
          </button>
          
          <button onClick={cerrarSesion} className="w-full py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black uppercase italic text-xs hover:bg-white/10 transition-all active:scale-95">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
