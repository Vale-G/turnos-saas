'use client'

type PricingProps = {
  precios: {
    basico: number
    pro: number
  }
  onRegisterClick: () => void
}

const CHECK_ICON = (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path
      d="M1.5 4l1.5 1.5 3.5-3"
      stroke="#94A3B8"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CHECK_ICON_PRO = (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
    <path
      d="M1.5 4l1.5 1.5 3.5-3"
      stroke="#22C55E"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function Pricing({ precios, onRegisterClick }: PricingProps) {
  return (
    <section className="max-w-3xl mx-auto px-6 pb-24">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-3">
        Precios simples
      </h2>
      <p className="text-slate-400 text-center mb-12">
        30 días gratis con todo incluido. Sin tarjeta de crédito.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white/4 border border-white/8 rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Básico
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">
                ${precios.basico.toLocaleString('es-AR')}
              </span>
              <span className="text-slate-400 text-sm">ARS/mes</span>
            </div>
          </div>

          <div className="p-6 space-y-2.5">
            {[
              'Reservas ilimitadas',
              '2 barberos',
              '5 servicios',
              'Agenda y cobros',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  {CHECK_ICON}
                </div>
                <span className="text-sm text-slate-400">{feature}</span>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={onRegisterClick}
              className="w-full py-4 rounded-2xl font-black italic text-base text-white border border-white/20 hover:bg-white/10 transition-all"
            >
              Empezar gratis
            </button>
          </div>
        </div>

        <div className="bg-[#6366F1]/5 border-2 border-[#6366F1]/40 rounded-[2rem] overflow-hidden">
          <div className="p-6 border-b border-[#6366F1]/20 bg-[#6366F1]/10">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6366F1]">
                Pro
              </p>
              <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                Recomendado
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-[#6366F1]">
                ${precios.pro.toLocaleString('es-AR')}
              </span>
              <span className="text-slate-400 text-sm">ARS/mes</span>
            </div>
          </div>

          <div className="p-6 space-y-2.5">
            {[
              'Todo lo del Básico',
              'Staff ilimitado',
              'Informes avanzados',
              'Historial de clientes',
              'MercadoPago integrado',
              'Recordatorios automáticos',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  {CHECK_ICON_PRO}
                </div>
                <span className="text-sm text-slate-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={onRegisterClick}
              className="w-full py-4 rounded-2xl font-black italic text-base text-white bg-[#6366F1] hover:opacity-90 transition-opacity"
            >
              Activar Pro — 30 días gratis
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
