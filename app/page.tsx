'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30">
      {/* Navegación */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black text-xl">T</div>
            <span className="font-black italic text-2xl tracking-tighter">Turnly.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-xs font-black uppercase text-slate-400 hover:text-white transition-colors">Ingresar</Link>
            <Link href="/login" className="bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform">Probar Gratis</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-20 text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8 relative z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Nuevo: Informes PRO y Lista Negra</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.9] mb-8 relative z-10">
          Tu negocio en <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Piloto Automático</span>
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-12 relative z-10 font-medium">
          El software de reservas definitivo. Olvidate de perder tiempo en WhatsApp. Cobrá señas por MercadoPago, gestioná a tu equipo y analizá tus ganancias en tiempo real.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <Link href="/login" className="w-full sm:w-auto bg-emerald-500 text-black px-8 py-5 rounded-full font-black uppercase italic text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            Crear mi cuenta gratis
          </Link>
          <Link href="#features" className="w-full sm:w-auto bg-white/5 border border-white/10 px-8 py-5 rounded-full font-black uppercase italic text-lg hover:bg-white/10 transition-colors">
            Ver Funciones
          </Link>
        </div>
      </main>

      {/* Features Destacadas */}
      <section id="features" className="border-t border-white/5 bg-white/[0.02] py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-[#020617] border border-white/10 p-10 rounded-[3rem] hover:border-emerald-500/50 transition-colors group">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">💳</div>
              <h3 className="text-2xl font-black uppercase italic mb-4">Señas Flexibles</h3>
              <p className="text-slate-400 text-sm">Cobrá un porcentaje o monto fijo por adelantado a través de MercadoPago para asegurar la asistencia de tus clientes.</p>
            </div>

            <div className="bg-[#020617] border border-white/10 p-10 rounded-[3rem] hover:border-cyan-500/50 transition-colors group">
              <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">📊</div>
              <h3 className="text-2xl font-black uppercase italic mb-4">Informes Elite</h3>
              <p className="text-slate-400 text-sm">Visualizá tus ingresos en tiempo real, descubrí tus servicios más rentables y medí el rendimiento de tu equipo.</p>
            </div>

            <div className="bg-[#020617] border border-white/10 p-10 rounded-[3rem] hover:border-rose-500/50 transition-colors group">
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">🚫</div>
              <h3 className="text-2xl font-black uppercase italic mb-4">Lista Negra</h3>
              <p className="text-slate-400 text-sm">Bloqueá a los clientes que te dejan plantado. El sistema les impedirá volver a sacar un turno automáticamente.</p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer Agencia */}
      <footer className="border-t border-white/5 py-12 text-center">
        <div className="inline-flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Desarrollado con ⚡ por</span>
          <span className="text-sm font-black italic text-blue-400 tracking-tighter">F&V TECH</span>
        </div>
      </footer>
    </div>
  )
}
