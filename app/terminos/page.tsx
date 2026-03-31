'use client'
import { useRouter } from 'next/navigation'

export default function TerminosYCondiciones() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/')} className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 hover:text-white transition-colors">← Volver al Inicio</button>
        
        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4">Términos y <span className="text-emerald-400">Condiciones</span></h1>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-12">Última actualización: Abril 2026</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">1. Naturaleza del Servicio (SaaS)</h2>
            <p>Turnly (desarrollado por F&V Tech) provee un software de gestión y reservas en la nube (Software as a Service) para profesionales y negocios ("El Cliente"). Turnly <strong>no es parte</strong> de la relación comercial entre El Cliente y sus usuarios finales.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">2. Pagos y Señas (MercadoPago)</h2>
            <p>El sistema facilita la integración con MercadoPago. Los fondos ingresan directamente a la cuenta de MercadoPago configurada por El Cliente. Turnly no retiene, administra ni es responsable por el dinero de las señas, contracargos, devoluciones o disputas comerciales.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">3. Suscripciones y Cortes de Servicio</h2>
            <p>El uso del sistema requiere una suscripción mensual activa (Planes Básico o PRO) luego del período de prueba. En caso de falta de pago, Turnly se reserva el derecho de suspender temporalmente el acceso al panel administrativo y al portal público de reservas hasta regularizar la situación.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">4. Disponibilidad (SLA)</h2>
            <p>Garantizamos un esfuerzo razonable para mantener un uptime del 99%. Sin embargo, Turnly no se hace responsable por pérdidas económicas derivadas de caídas temporales del servidor, cortes de internet, o interrupciones en la API de MercadoPago.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
