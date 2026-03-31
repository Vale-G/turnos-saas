'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LandingElite() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 overflow-hidden font-sans">
      {/* Luces de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <nav className="relative z-10 flex items-center justify-between p-6 md:px-12 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Image src="/fvtech-logo.jpg" alt="F&V Tech" width={40} height={40} className="rounded-xl border border-white/10" />
          <span className="font-black italic text-xl tracking-tighter">Turnly.</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push('/login')} className="text-xs font-black uppercase text-slate-400 hover:text-white transition-colors px-4 py-2">Ingresar</button>
          <button onClick={() => router.push('/registro-negocio')} className="text-xs font-black uppercase bg-white text-black px-5 py-2.5 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95">Crear Negocio</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-block border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full mb-8">
          SaaS Exclusivo para Barberías y Salones
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.9] mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
          Gestioná tu local <br /> <span className="text-emerald-400">como un CEO.</span>
        </h1>
        
        <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium mb-12">
          Olvidate de los mensajes a cualquier hora. Agenda inteligente, cobro de señas por MercadoPago, métricas financieras y un panel de lujo para tu negocio.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={() => router.push('/registro-negocio')} className="bg-emerald-500 text-black font-black uppercase italic text-lg px-10 py-5 rounded-[2rem] hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95">
            Prueba Gratis de 14 Días
          </button>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-sm hover:border-white/20 transition-colors">
            <div className="text-4xl mb-6">📅</div>
            <h3 className="text-xl font-black italic uppercase mb-3">Agenda 24/7</h3>
            <p className="text-slate-500 text-sm">Tus clientes reservan solos en cualquier momento. El sistema bloquea horarios cruzados automáticamente.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
            <div className="text-4xl mb-6">💸</div>
            <h3 className="text-xl font-black italic uppercase mb-3 text-emerald-400">Cero Faltazos</h3>
            <p className="text-slate-500 text-sm">Integración total con MercadoPago. Cobrá una seña del 50% para confirmar el turno y asegurá tu dinero.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-sm hover:border-white/20 transition-colors">
            <div className="text-4xl mb-6">📊</div>
            <h3 className="text-xl font-black italic uppercase mb-3">Métricas PRO</h3>
            <p className="text-slate-500 text-sm">Conocé tu facturación, tu ticket promedio y quién es el barbero que más produce en tiempo real.</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 py-12 text-center relative z-10 bg-[#020617]">
        <Image src="/fvtech-logo.jpg" alt="F&V Tech" width={32} height={32} className="mx-auto rounded-lg border border-white/10 mb-4 opacity-50" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Desarrollado por F&V Tech © 2026</p>
      </footer>
    </div>
  )
}
