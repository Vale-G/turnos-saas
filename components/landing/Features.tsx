'use client'

export type LandingFeature = {
  icon: string
  titulo: string
  desc: string
}

type FeaturesProps = {
  items: LandingFeature[]
}

export default function Features({ items }: FeaturesProps) {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-24">
      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-12">
        Todo lo que necesitás en un solo lugar
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {items.map((feature) => (
          <div
            key={feature.titulo}
            className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/6 transition-colors"
          >
            <div className="text-2xl mb-3">{feature.icon}</div>
            <h3 className="font-black uppercase italic mb-1">{feature.titulo}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
