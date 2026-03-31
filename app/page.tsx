'use client'
import { useRouter } from 'next/navigation'

export default function LandingComercial() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <nav className="relative z-10 flex items-center justify-between p-6 md:px-12 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <span className="font-black italic text-2xl tracking-tighter">Turnly.</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push('/login')} className="text-xs font-black uppercase text-slate-400 hover:text-white transition-colors px-4 py-2">Ingresar</button>
          <button onClick={() => router.push('/registro-negocio')} className="text-xs font-black uppercase bg-white text-black px-6 py-2.5 rounded-full hover:bg-emerald-400 transition-all shadow-lg active:scale-95 hidden md:block">Prueba Gratis</button>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-block border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-full mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          El Software Definitivo para Barberías
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.9] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
          Digitalizá tu local. <br /> <span className="text-emerald-400">Multiplicá tus ingresos.</span>
        </h1>
        
        <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium mb-12">
          Turnly te da una agenda 24/7, cobro de señas por MercadoPago para evitar faltazos, y un control financiero para que sepas exactamente cuánta plata ganás.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-24">
          <button onClick={() => router.push('/registro-negocio')} className="bg-emerald-500 text-black font-black uppercase italic text-lg px-12 py-6 rounded-[2.5rem] hover:bg-emerald-400 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95">
            Comenzar Prueba de 14 Días
          </button>
        </div>

        {/* BENEFICIOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-32">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] hover:border-white/20 transition-all hover:-translate-y-2">
            <div className="text-5xl mb-6">🚫</div>
            <h3 className="text-2xl font-black italic uppercase mb-3 text-white">Chau Faltazos</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Cobrá señas automáticas del 50% con MercadoPago. Si el cliente no paga en el momento, el turno se libera solo.</p>
          </div>
          <div className="bg-white/5 border border-emerald-500/20 p-10 rounded-[3rem] hover:border-emerald-500/40 transition-all hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl" />
            <div className="text-5xl mb-6">💰</div>
            <h3 className="text-2xl font-black italic uppercase mb-3 text-emerald-400">Control de Caja</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Registrá tus gastos (luz, alquiler, insumos) y conocé tu ganancia neta real a fin de mes.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] hover:border-white/20 transition-all hover:-translate-y-2">
            <div className="text-5xl mb-6">📱</div>
            <h3 className="text-2xl font-black italic uppercase mb-3 text-white">Marca Propia</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Tus clientes reservan en una página con tu logo y tus colores. Experiencia premium desde el celular.</p>
          </div>
        </div>

        {/* PRECIOS */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-12">Planes Simples y Claros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="bg-black border border-white/10 p-12 rounded-[3.5rem]">
              <h3 className="text-3xl font-black italic uppercase mb-2">Básico</h3>
              <p className="text-slate-500 text-sm mb-8">Ideal para barberos independientes.</p>
              <p className="text-5xl font-black italic mb-8">$10.000 <span className="text-xl text-slate-500">/mes</span></p>
              <ul className="space-y-4 mb-10 text-sm font-bold text-slate-300">
                <li>✓ 1 Profesional</li>
                <li>✓ Hasta 10 Servicios</li>
                <li>✓ Agenda online 24/7</li>
                <li>✕ Sin control de caja</li>
                <li>✕ Sin cobro de señas</li>
              </ul>
              <button onClick={() => router.push('/registro-negocio')} className="w-full py-5 rounded-full border border-white/20 font-black uppercase text-sm hover:bg-white hover:text-black transition-colors">Elegir Básico</button>
            </div>
            
            <div className="bg-white/5 border border-emerald-500/40 p-12 rounded-[3.5rem] relative overflow-hidden">
              <div className="absolute top-6 right-6 bg-emerald-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">Recomendado</div>
              <h3 className="text-3xl font-black italic uppercase mb-2 text-emerald-400">PRO Elite</h3>
              <p className="text-slate-400 text-sm mb-8">Para locales que quieren escalar.</p>
              <p className="text-5xl font-black italic mb-8 text-white">$25.000 <span className="text-xl text-slate-500">/mes</span></p>
              <ul className="space-y-4 mb-10 text-sm font-bold text-white">
                <li>✓ Profesionales Ilimitados</li>
                <li>✓ Servicios Ilimitados</li>
                <li>✓ Cobro de Señas (MercadoPago)</li>
                <li>✓ Control de Caja y Ganancia Neta</li>
                <li>✓ Informes y Estadísticas</li>
              </ul>
              <button onClick={() => router.push('/registro-negocio')} className="w-full py-5 rounded-full bg-emerald-500 text-black font-black uppercase text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20">Probar 14 Días Gratis</button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-16 text-center bg-[#020617] relative z-10">
        <div className="flex flex-col items-center justify-center gap-6">
          <span className="font-black italic text-3xl tracking-tighter text-white/50">Turnly.</span>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 max-w-xs">Un producto desarrollado con excelencia por F&V Tech.</p>
          <div className="flex gap-6 mt-4">
            <a href="#" className="text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-colors">Instagram</a>
            <a href="#" className="text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-colors">Soporte</a>
            <a href="#" className="text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
