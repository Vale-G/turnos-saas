'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Hero from '@/components/landing/Hero'
import Mockup from '@/components/landing/Mockup'
import Features, { type LandingFeature } from '@/components/landing/Features'
import Pricing from '@/components/landing/Pricing'
import Footer from '@/components/Footer'

const FEATURES: LandingFeature[] = [
  { icon: '📅', titulo: 'Reservas 24/7', desc: 'Tus clientes reservan desde el celular a cualquier hora, sin llamarte.' },
  { icon: '💰', titulo: 'Cobros integrados', desc: 'Registrá cobros en efectivo, transferencia o MercadoPago.' },
  { icon: '📊', titulo: 'Estadísticas reales', desc: 'Sabé cuánto cobraste, qué servicios venden más y quiénes son tus mejores clientes.' },
  { icon: '💬', titulo: 'WhatsApp automático', desc: 'Confirmaciones y recordatorios por WhatsApp sin que hagas nada.' },
  { icon: '👥', titulo: 'Multi-barbero', desc: 'Gestioná todo tu equipo desde un solo panel.' },
  { icon: '📱', titulo: 'Sin app que instalar', desc: 'Tus clientes reservan desde el navegador, sin descargar nada.' },
]

export default function Landing() {
  const router = useRouter()
  const [precios, setPrecios] = React.useState({ basico: 5000, pro: 25000 })

  React.useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('config')
        .select('clave, valor')
        .in('clave', ['precio_basico', 'precio_pro'])
        .then(({ data }) => {
          if (data) {
            const pm: Record<string, number> = {}
            data.forEach((c: { clave: string; valor: string }) => {
              pm[c.clave] = Number(c.valor)
            })
            setPrecios({ basico: pm.precio_basico ?? 5000, pro: pm.precio_pro ?? 25000 })
          }
        })
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#0F172A] border border-white/10">
            <img src="/fvtech-logo.jpg" alt="F&V Tech" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xl font-black italic tracking-tighter">
              turn<span className="text-[#6366F1]">ly</span>
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600" style={{ letterSpacing: '0.15em' }}>
              by F&amp;V Tech
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/login')}
            className="text-slate-400 hover:text-white text-sm font-bold transition-colors px-4 py-2"
          >
            Ingresar
          </button>
          <button
            onClick={() => router.push('/registro-negocio')}
            className="bg-[#6366F1] hover:opacity-90 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-opacity"
          >
            Probar gratis
          </button>
        </div>
      </nav>

      <Hero onPrimaryClick={() => router.push('/registro-negocio')} onSecondaryClick={() => router.push('/reservar/demo')} />

      <Mockup />

      <Features items={FEATURES} />

      <Pricing precios={precios} onRegisterClick={() => router.push('/registro-negocio')} />

      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-[2rem] p-10">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-3">Empezá hoy. Es gratis.</h2>
          <p className="text-slate-400 mb-6">30 días con todo el plan Pro incluido. Sin tarjeta. Sin compromiso.</p>
          <p className="text-slate-600 text-xs mb-4">
            Desarrollado con ❤️ por <span className="text-[#6366F1] font-bold">F&amp;V Tech</span>
          </p>
          <button
            onClick={() => router.push('/registro-negocio')}
            className="bg-[#6366F1] hover:opacity-90 text-white font-black italic text-lg px-10 py-4 rounded-2xl transition-opacity"
          >
            Crear mi cuenta gratis
          </button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
