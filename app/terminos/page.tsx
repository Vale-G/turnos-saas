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
            <p>Turnly provee un software de gestión y reservas en la nube (Software as a Service) para profesionales y negocios (&quot;El Cliente&quot;). Turnly <strong>no es parte</strong> de la relación comercial entre El Cliente y sus usuarios finales.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">2. Pagos y Señas (MercadoPago)</h2>
            <p>El sistema facilita la integración con MercadoPago. Los fondos ingresan directamente a la cuenta de MercadoPago configurada por El Cliente. Turnly no retiene, administra ni es responsable por el dinero de las señas, contracargos, devoluciones o disputas comerciales.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">3. Suscripciones y Cortes de Servicio</h2>
            <p>La prueba dura 14 días. Para continuar recibiendo reservas nuevas se necesita un período vigente de Básico o Pro. Desde Mi suscripción se puede solicitar la baja de próximas renovaciones. Una vez confirmada por el proveedor, se conserva el acceso ya pagado hasta su vencimiento. Los datos y turnos existentes siguen disponibles.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">4. Disponibilidad (SLA)</h2>
            <p>Trabajamos para mantener Turnly disponible. El servicio puede sufrir interrupciones temporales. Sin embargo, Turnly no se hace responsable por pérdidas económicas derivadas de caídas temporales del servidor, cortes de internet, o interrupciones en la API de MercadoPago.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
