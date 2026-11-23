'use client'
import { useRouter } from 'next/navigation'

export default function PoliticaPrivacidad() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/')} className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 hover:text-white transition-colors">← Volver al Inicio</button>
        
        <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4">Política de <span className="text-emerald-400">Privacidad</span></h1>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-12">Última actualización: Abril 2026</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">
          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">1. Recopilación de Datos</h2>
            <p>Recopilamos información básica para el funcionamiento del software: nombre, correo electrónico y teléfono de contacto de los administradores de los locales, así como los datos que los usuarios finales ingresan voluntariamente para realizar una reserva (Nombre y WhatsApp).</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">2. Uso de la Información</h2>
            <p>Los datos telefónicos y de correo electrónico se utilizan exclusivamente para enviar notificaciones de confirmación de turnos, recordatorios y operar el servicio. <strong>Bajo ningún concepto vendemos, alquilamos ni cedemos bases de datos a terceros.</strong></p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">3. Seguridad y Almacenamiento</h2>
            <p>Los datos son almacenados en servidores seguros (Supabase) con encriptación estándar de la industria. Los pagos procesados a través de MercadoPago son gestionados íntegramente por dicha plataforma; Turnly no almacena datos de tarjetas de crédito o débito.</p>
          </section>

          <section className="bg-white/5 border border-white/10 p-8 rounded-[2rem]">
            <h2 className="text-xl font-black uppercase italic text-white mb-4">4. Propiedad de los Datos</h2>
            <p>La base de datos de clientes generada por un negocio le pertenece exclusivamente a dicho negocio. Si El Cliente decide cancelar su suscripción, puede solicitar la exportación o eliminación total de sus datos contactando a soporte.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
