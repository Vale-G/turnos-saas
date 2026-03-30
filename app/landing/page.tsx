'use client'
import React from 'react'
import { useRouter } from 'next/navigation'

const FEATURES = [
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
      supabase.from('config').select('clave, valor')
        .in('clave', ['precio_basico', 'precio_pro'])
        .then(({ data }) => {
          if (data) {
            const pm: Record<string, number> = {}
            data.forEach((c: { clave: string; valor: string }) => { pm[c.clave] = Number(c.valor) })
            setPrecios({ basico: pm.precio_basico ?? 5000, pro: pm.precio_pro ?? 25000 })
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
            <img src="/fvtech-logo.jpg" alt="F&V Tech" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xl font-black italic tracking-tighter">
              turn<span className="text-[#6366F1]">ly</span>
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-600" style={{letterSpacing: '0.15em'}}>by F&amp;V Tech</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/login')}
            className="text-slate-400 hover:text-white text-sm font-bold transition-colors px-4 py-2">
            Ingresar
          </button>
          <button onClick={() => router.push('/registro-negocio')}
            className="bg-[#6366F1] hover:opacity-90 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-opacity">
            Probar gratis
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-full px-4 py-1.5 mb-6">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-[#6366F1]">30 días gratis · Sin tarjeta de crédito</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-6">
          Tus clientes reservan solos.
          <br />
          <span className="text-[#6366F1]">Vos te concentrás en cortar.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          El sistema de turnos para barberías, peluquerías y centros de estética que no quieren perder tiempo con WhatsApps y llamadas.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => router.push('/registro-negocio')}
            className="w-full sm:w-auto bg-[#6366F1] hover:opacity-90 text-white font-black italic text-lg px-8 py-4 rounded-2xl transition-opacity">
            Empezar gratis ahora
          </button>
          <button onClick={() => router.push('/reservar/demo')}
            className="w-full sm:w-auto bg-white/8 hover:bg-white/12 border border-white/10 text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors">
            Ver demo en vivo →
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-4">Sin tarjeta de crédito · Cancelás cuando quieras</p>
      </section>

      {/* Mockup (Resumido para el ejemplo) */}
      <section className="max-w-2xl mx-auto px-6 pb-24 opacity-50">
        <div className="bg-[#0F172A] rounded-[2rem] border border-white/8 p-6 text-center italic text-slate-500">
          Vista previa del panel...
        </div>
      </section>

      {/* Features y Precios (Mantenemos la estructura) */}
      <section className="text-center py-20 px-6">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-12">Simplicidad total</h2>
        {/* ... Resto de features ... */}
      </section>

      {/* Footer con Acceso Admin */}
      <footer className="border-t border-white/5 px-6 py-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10">
            <img src="/fvtech-logo.jpg" alt="F&V Tech" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <span className="font-black italic block">turn<span className="text-[#6366F1]">ly</span></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">by F&amp;V Tech</span>
          </div>
        </div>
        <p className="text-slate-600 text-xs">Tus turnos, tu negocio. · Desarrollado por <span className="text-[#6366F1] font-bold">F&amp;V Tech</span> 🇦🇷</p>
        
        {/* BOTÓN SECRETO / PEQUEÑO */}
        <div className="mt-8">
          <button 
            onClick={() => router.push('/superadmin')}
            className="text-[10px] text-slate-800 hover:text-slate-500 font-bold uppercase tracking-widest transition-colors"
          >
            Acceso Admin
          </button>
        </div>
      </footer>
    </div>
  )
}
