'use client'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Hero y Nav (Igual que antes) */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-black text-xl">T</div><span className="font-black italic text-2xl tracking-tighter">Turnly.</span></div>
          <Link href="/login" className="bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase hover:scale-105 transition-transform">Probar Gratis</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-4xl mx-auto px-6 pt-32 pb-20 text-center">
        <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8] mb-8">MENOS WHATSAPP, <span className="text-emerald-500">MÁS CORTES.</span></h1>
        <p className="text-slate-400 text-lg font-medium max-w-xl mx-auto mb-10">La plataforma de gestión para barberías y centros de estética que escala tu negocio.</p>
        <Link href="/login" className="inline-block bg-emerald-500 text-black px-10 py-6 rounded-full font-black uppercase italic text-xl shadow-[0_0_50px_rgba(16,185,129,0.4)]">Empezar Ahora</Link>
      </header>

      {/* TABLA DE PLANES (Lo que faltaba) */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-16">Elegí tu plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 p-12 rounded-[4rem] hover:border-white/20 transition-all">
              <h3 className="text-4xl font-black uppercase italic mb-2">Plan Basic</h3>
              <p className="text-emerald-500 font-black text-2xl mb-8">GRATIS</p>
              <ul className="space-y-4 text-sm font-bold text-slate-400 mb-10">
                <li>✓ Hasta 50 turnos mensuales</li>
                <li>✓ Agenda básica</li>
                <li>✓ Gestión de Clientes</li>
                <li className="opacity-30">✗ Señas por MercadoPago</li>
                <li className="opacity-30">✗ Informes Avanzados</li>
              </ul>
              <Link href="/login" className="block text-center py-4 rounded-2xl bg-white/10 font-black uppercase text-xs">Empezar Gratis</Link>
            </div>
            
            <div className="bg-emerald-500 border border-emerald-400 p-12 rounded-[4rem] text-black relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 font-black text-[10px] uppercase tracking-widest bg-black text-white rounded-bl-3xl">RECOMENDADO</div>
              <h3 className="text-4xl font-black uppercase italic mb-2">Plan PRO</h3>
              <p className="font-black text-2xl mb-8">$25.000 <span className="text-xs uppercase">/ mes</span></p>
              <ul className="space-y-4 text-sm font-black mb-10">
                <li>✓ Turnos ILIMITADOS</li>
                <li>✓ Señas Flexibles (MercadoPago)</li>
                <li>✓ Informes de Ganancia Real</li>
                <li>✓ Lista Negra de Clientes</li>
                <li>✓ Soporte F&V Tech 24/7</li>
              </ul>
              <Link href="/login" className="block text-center py-4 rounded-2xl bg-black text-white font-black uppercase text-xs">Pasar a Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer F&V TECH */}
      <footer className="py-20 border-t border-white/5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-4">Un producto de</p>
        <p className="text-2xl font-black italic tracking-tighter text-blue-400">F&V TECH</p>
      </footer>
    </div>
  )
}
