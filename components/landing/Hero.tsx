'use client'

type HeroProps = {
  onPrimaryClick: () => void
  onSecondaryClick: () => void
}

export default function Hero({ onPrimaryClick, onSecondaryClick }: HeroProps) {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
      <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-full px-4 py-1.5 mb-6">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold text-[#6366F1]">
          30 días gratis · Sin tarjeta de crédito
        </span>
      </div>
      <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-6">
        Tus clientes reservan solos.
        <br />
        <span className="text-[#6366F1]">Vos te concentrás en cortar.</span>
      </h1>
      <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
        El sistema de turnos para barberías, peluquerías y centros de estética
        que no quieren perder tiempo con WhatsApps y llamadas.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onPrimaryClick}
          className="w-full sm:w-auto bg-[#6366F1] hover:opacity-90 text-white font-black italic text-lg px-8 py-4 rounded-2xl transition-opacity"
        >
          Empezar gratis ahora
        </button>
        <button
          onClick={onSecondaryClick}
          className="w-full sm:w-auto bg-white/8 hover:bg-white/12 border border-white/10 text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors"
        >
          Ver demo en vivo →
        </button>
      </div>
      <p className="text-slate-600 text-xs mt-4">
        Sin tarjeta de crédito · Cancelás cuando quieras
      </p>
    </section>
  )
}
