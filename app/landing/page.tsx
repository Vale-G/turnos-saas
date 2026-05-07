'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

const FEATURES = [
  {
    icon: '📅',
    titulo: 'Reservas 24/7',
    desc: 'Tus clientes reservan desde el celular a cualquier hora, sin llamarte.',
  },
  {
    icon: '💰',
    titulo: 'Cobros integrados',
    desc: 'Registrá cobros en efectivo, transferencia o MercadoPago.',
  },
  {
    icon: '📊',
    titulo: 'Estadísticas reales',
    desc: 'Sabé cuánto cobraste, qué servicios venden más y quiénes son tus mejores clientes.',
  },
  {
    icon: '💬',
    titulo: 'WhatsApp automático',
    desc: 'Confirmaciones y recordatorios por WhatsApp sin que hagas nada.',
  },
  {
    icon: '👥',
    titulo: 'Multi-barbero',
    desc: 'Gestioná todo tu equipo desde un solo panel.',
  },
  {
    icon: '📱',
    titulo: 'Sin app que instalar',
    desc: 'Tus clientes reservan desde el navegador, sin descargar nada.',
  },
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
            setPrecios({
              basico: pm.precio_basico ?? 5000,
              pro: pm.precio_pro ?? 25000,
            })
          }
        })
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#0F172A] border border-white/10">
            <img
              src="/fvtech-logo.jpg"
              alt="F&V Tech"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xl font-black italic tracking-tighter">
              turn<span className="text-[#6366F1]">ly</span>
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-widest text-slate-600"
              style={{ letterSpacing: '0.15em' }}
            >
              by F&V Tech
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

      {/* Hero */}
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
            onClick={() => router.push('/registro-negocio')}
            className="w-full sm:w-auto bg-[#6366F1] hover:opacity-90 text-white font-black italic text-lg px-8 py-4 rounded-2xl transition-opacity"
          >
            Empezar gratis ahora
          </button>
          <button
            onClick={() => router.push('/reservar/demo')}
            className="w-full sm:w-auto bg-white/8 hover:bg-white/12 border border-white/10 text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors"
          >
            Ver demo en vivo →
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-4">
          Sin tarjeta de crédito · Cancelás cuando quieras
        </p>
      </section>

      {/* Mockup */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <div className="bg-[#0F172A] rounded-[2rem] border border-white/8 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 bg-[#6366F1] rounded-lg flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                <path
                  d="M11 7v4l2.5 2.5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="font-black italic text-sm">Barberia El Flaco</span>
            <span className="ml-auto text-[9px] bg-amber-400 text-black font-black uppercase px-2 py-0.5 rounded-full">
              PRO
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1E293B] rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">
                Cobrado hoy
              </p>
              <p className="text-2xl font-black text-[#6366F1]">$47.500</p>
            </div>
            <div className="bg-[#1E293B] rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">
                Turnos hoy
              </p>
              <p className="text-2xl font-black">8</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              {
                nombre: 'Matias R.',
                servicio: 'Corte + barba',
                hora: '10:00',
                color: '#22C55E',
                estado: 'cobrado',
              },
              {
                nombre: 'Juan P.',
                servicio: 'Corte clásico',
                hora: '11:30',
                color: '#6366F1',
                estado: 'confirmado',
              },
              {
                nombre: 'Carlos M.',
                servicio: 'Barba perfilada',
                hora: '12:00',
                color: '#F59E0B',
                estado: 'pendiente',
              },
            ].map((t) => (
              <div
                key={t.nombre}
                className="bg-[#1E293B] rounded-xl p-3 flex items-center gap-3"
              >
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm truncate">{t.nombre}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {t.servicio}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-sm" style={{ color: t.color }}>
                    {t.hora}
                  </p>
                  <p
                    className="text-[9px] uppercase font-black"
                    style={{ color: t.color }}
                  >
                    {t.estado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-12">
          Todo lo que necesitás en un solo lugar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.titulo}
              className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/6 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-black uppercase italic mb-1">{f.titulo}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Precios */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-center mb-3">
          Precios simples
        </h2>
        <p className="text-slate-400 text-center mb-12">
          30 días gratis con todo incluido. Sin tarjeta de crédito.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Basico */}
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
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l1.5 1.5 3.5-3"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => router.push('/registro-negocio')}
                className="w-full py-4 rounded-2xl font-black italic text-base text-white border border-white/20 hover:bg-white/10 transition-all"
              >
                Empezar gratis
              </button>
            </div>
          </div>
          {/* Pro */}
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
              ].map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l1.5 1.5 3.5-3"
                        stroke="#22C55E"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-200">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => router.push('/registro-negocio')}
                className="w-full py-4 rounded-2xl font-black italic text-base text-white bg-[#6366F1] hover:opacity-90 transition-opacity"
              >
                Activar Pro — 30 días gratis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-[2rem] p-10">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-3">
            Empezá hoy. Es gratis.
          </h2>
          <p className="text-slate-400 mb-6">
            30 días con todo el plan Pro incluido. Sin tarjeta. Sin compromiso.
          </p>
          <p className="text-slate-600 text-xs mb-4">
            Desarrollado con ❤️ por{' '}
            <span className="text-[#6366F1] font-bold">F&V Tech</span>
          </p>
          <button
            onClick={() => router.push('/registro-negocio')}
            className="bg-[#6366F1] hover:opacity-90 text-white font-black italic text-lg px-10 py-4 rounded-2xl transition-opacity"
          >
            Crear mi cuenta gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
            <img
              src="/fvtech-logo.jpg"
              alt="F&V Tech"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <span className="font-black italic block">
              turn<span className="text-[#6366F1]">ly</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              by F&V Tech
            </span>
          </div>
        </div>
        <p className="text-slate-600 text-xs mb-4">
          Tus turnos, tu negocio. · Desarrollado por{' '}
          <span className="text-[#6366F1] font-bold">F&V Tech</span> 🇦🇷
        </p>

        {/* Acceso Admin discreto */}
        <button
          onClick={() => router.push('/superadmin')}
          className="text-[10px] text-slate-800 hover:text-slate-500 font-bold uppercase tracking-widest transition-colors mt-4"
        >
          Acceso Admin
        </button>
      </footer>
    </div>
  )
}
