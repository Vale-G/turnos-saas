import Link from 'next/link'
import { brandConfig } from '@/config/brand'

export default function TerminosPage() {
  const appName = brandConfig.appName
  const updatedAt = '9 de abril de 2026'

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
          ← Volver al inicio
        </Link>

        <h1 className="mt-8 text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          Términos y <span className="text-emerald-400">Condiciones</span>
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">Última actualización: {updatedAt}</p>

        <div className="mt-10 space-y-6 text-slate-200">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">1. Objeto del servicio</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {appName} es un software provisto bajo modalidad SaaS para gestión de turnos, cobros y operación comercial.
              El cliente acepta que {appName} actúa como proveedor tecnológico y no participa de la relación contractual
              entre el negocio y sus usuarios finales.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">2. Registro y cuenta</h2>
            <p className="mt-3 text-sm leading-relaxed">
              El cliente es responsable de la veracidad de la información registrada y de mantener la confidencialidad de sus credenciales.
              Toda acción realizada desde su cuenta se considera autorizada por el titular, salvo notificación previa de uso no autorizado.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">3. Suscripciones, facturación y pasarelas</h2>
            <p className="mt-3 text-sm leading-relaxed">
              El acceso puede estar sujeto a planes de pago. El cliente autoriza a {appName} a gestionar cobros mediante
              proveedores terceros (por ejemplo, Stripe o MercadoPago), quedando dichas operaciones sujetas también a los términos de esas plataformas.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">4. Uso aceptable</h2>
            <p className="mt-3 text-sm leading-relaxed">
              Está prohibido utilizar {appName} para actividades ilícitas, fraudulentas o que vulneren derechos de terceros.
              El incumplimiento podrá derivar en suspensión temporal o cancelación definitiva del servicio.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">5. Disponibilidad y limitación de responsabilidad</h2>
            <p className="mt-3 text-sm leading-relaxed">
              {appName} realiza esfuerzos razonables para asegurar continuidad operativa, pero no garantiza disponibilidad ininterrumpida.
              En ningún caso será responsable por lucro cesante, pérdida de datos o daños indirectos derivados del uso del servicio.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-black uppercase italic text-white">6. Propiedad intelectual</h2>
            <p className="mt-3 text-sm leading-relaxed">
              El software, la marca, interfaces y contenidos de {appName} son propiedad de sus titulares y se encuentran protegidos por leyes aplicables.
              No se concede licencia de explotación comercial sobre estos activos, salvo autorización expresa por escrito.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
