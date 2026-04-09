import Link from 'next/link'
import { brandConfig } from '@/config/brand'

export default function PrivacidadPage() {
  const appName = brandConfig.appName
  const updatedAt = '9 de abril de 2026'

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
          ← Volver al inicio
        </Link>

        <h1 className="mt-8 text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Política de <span className="text-emerald-400">Privacidad</span>
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">Última actualización: {updatedAt}</p>

        <div className="mt-10 space-y-6 text-slate-200">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">1. Datos que recopilamos</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {appName} recopila datos de identificación y contacto del negocio, información operativa de turnos y datos de clientes finales
              cargados por el propio negocio. Solo se solicitan datos necesarios para prestar el servicio.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">2. Finalidad del tratamiento</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Usamos los datos para operar la plataforma, enviar notificaciones, mejorar funcionalidades, prevenir fraude
              y cumplir obligaciones legales y contractuales vinculadas al servicio.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">3. Base legal y consentimiento</h2>
            <p className="mt-3 text-sm leading-relaxed">
              El tratamiento se basa en la ejecución del contrato de servicio con el cliente y, cuando corresponde, en el consentimiento
              para finalidades específicas como comunicaciones comerciales.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">4. Compartición con terceros</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {appName} puede compartir información con proveedores de infraestructura, mensajería y cobros (como Stripe o MercadoPago),
              estrictamente para la prestación del servicio y bajo medidas de seguridad apropiadas.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">5. Conservación y seguridad</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Conservamos los datos durante el tiempo necesario para la operación contractual o por exigencias legales.
              Implementamos controles técnicos y organizativos razonables para proteger la confidencialidad e integridad de la información.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">6. Derechos del titular</h2>
            <p className="mt-3 text-sm leading-relaxed">
              El titular podrá solicitar acceso, rectificación, actualización, oposición o eliminación de sus datos conforme a la normativa aplicable.
              Para ejercer estos derechos, deberá contactarse con el responsable del negocio o con soporte de {appName}.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
