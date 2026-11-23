'use client'

import { useRouter } from 'next/navigation'
import { AppearancePicker } from '@/components/ProductAppearance'

const RUBROS = ['Consultorios', 'Estética', 'Peluquerías', 'Manicuría', 'Barberías', 'Profesionales']
const FEATURES = [
  ['Agenda clara', 'Visualizá el día, la semana y cada profesional sin perderte entre mensajes.'],
  ['Reservas online', 'Compartí un enlace propio para que tus clientes elijan servicio, profesional y horario.'],
  ['Disponibilidad real', 'Turnly respeta duración, bloqueos y horarios para evitar reservas incompatibles.'],
  ['Cobros y señas', 'Registrá señas, saldos y gastos de tus turnos.'],
  ['Clientes e historial', 'Conservá reservas, notas y movimientos dentro del negocio correspondiente.'],
  ['Identidad propia', 'Logo, color y experiencia pública preparados para representar a cada marca.'],
]

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-3" aria-label="Turnly"><div className={`${compact ? 'h-9 w-9 rounded-xl' : 'h-11 w-11 rounded-2xl'} grid place-items-center bg-product-accent text-product-button-ink shadow-[0_12px_40px_rgba(99,102,241,.35)]`}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m9 14 2 2 4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div><span className={`${compact ? 'text-xl' : 'text-2xl'} font-black tracking-[-.06em]`}>turn<span className="text-product-accent">ly</span></span></div>
}

function ProductPreview() {
  const rows = [
    ['09:00', 'Consulta inicial', 'Confirmado', 'border-indigo-400/40 bg-indigo-400/10'],
    ['10:30', 'Sesión de seguimiento', 'Seña recibida', 'border-emerald-400/40 bg-emerald-400/10'],
    ['12:00', 'Horario bloqueado', 'Almuerzo', 'border-slate-500/30 bg-slate-500/10'],
    ['14:00', 'Servicio personalizado', 'Pendiente', 'border-amber-300/40 bg-amber-300/10'],
  ]
  return <div className="relative mx-auto max-w-5xl px-5"><div className="absolute inset-x-20 -top-14 h-48 rounded-full bg-product-accent/20 blur-[90px]" /><div className="relative overflow-hidden rounded-[2rem] border border-product-line bg-product-surface shadow-[0_50px_120px_rgba(0,0,0,.5)]"><div className="flex items-center gap-2 border-b border-product-line px-5 py-4"><span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /><span className="ml-3 text-xs font-semibold text-product-muted">Agenda de Espacio Norte · ejemplo ilustrativo</span></div><div className="grid gap-5 p-5 lg:grid-cols-[.75fr_1.8fr] lg:p-7"><aside className="rounded-3xl border border-product-line bg-product-surface p-5"><p className="text-xs font-bold uppercase tracking-[.22em] text-product-accent">Hoy</p><p className="mt-2 text-3xl font-black">8 turnos</p><p className="mt-1 text-sm text-product-muted">3 profesionales disponibles</p><div className="mt-6 space-y-2 text-sm text-product-muted">{['Agenda', 'Clientes', 'Servicios', 'Cobros'].map((item, index) => <div key={item} className={`rounded-xl px-3 py-2.5 ${index === 0 ? 'bg-product-accent text-product-button-ink' : ''}`}>{item}</div>)}</div></aside><div className="rounded-3xl border border-product-line bg-product-bg p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold text-product-ink">Martes 10</p><p className="text-xs text-product-muted">Vista del equipo</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-product-accent">Agenda al día</span></div><div className="grid grid-cols-[60px_1fr] gap-x-3 gap-y-2">{rows.map(([time, title, status, color]) => <div className="contents" key={time}><span className="pt-4 text-xs font-bold text-product-muted">{time}</span><div className={`rounded-2xl border p-4 ${color}`}><p className="font-bold text-product-ink">{title}</p><p className="mt-1 text-xs text-product-muted">{status}</p></div></div>)}</div></div></div></div></div>
}

export default function TurnlyLanding() {
  const router = useRouter()
  const register = () => router.push('/registro-negocio')
  const demo = () => document.getElementById('ejemplo')?.scrollIntoView()
  return <main className="product-shell min-h-screen overflow-hidden selection:bg-emerald-400/30">
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-8"><BrandMark compact /><div className="flex flex-wrap items-center gap-2"><AppearancePicker /><button onClick={() => router.push('/login')} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-product-muted hover:bg-product-subtle hover:text-product-ink">Ingresar</button><button onClick={register} className="rounded-xl bg-product-accent px-4 py-2.5 text-sm font-black text-product-button-ink hover:brightness-90">Crear cuenta</button></div></nav>
    <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 text-center md:px-8 md:pt-24"><div className="absolute left-1/2 top-8 h-80 w-80 -translate-x-1/2 rounded-full bg-product-accent/20 blur-[120px]" /><div className="relative"><p className="mx-auto mb-7 w-fit rounded-full border border-indigo-300/15 bg-indigo-400/10 px-4 py-2 text-xs font-bold text-product-accent">Agenda, reservas y gestión en un solo lugar</p><h1 className="mx-auto max-w-5xl text-5xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl md:text-8xl">Tu negocio tiene su ritmo.<br /><span className="text-product-accent">Turnly lo organiza.</span></h1><p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-product-muted md:text-lg">Tus clientes reservan desde un enlace y vos organizás los turnos desde una agenda compartida con tu equipo.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={register} className="rounded-2xl bg-product-accent px-7 py-4 font-black text-product-button-ink shadow-[0_18px_50px_rgba(99,102,241,.3)] hover:brightness-90">Crear mi espacio</button><button onClick={demo} className="rounded-2xl border border-product-line bg-product-subtle px-7 py-4 font-bold hover:bg-white/10">Ver ejemplo de agenda</button></div></div></section>
    <section id="ejemplo" aria-label="Ejemplo de agenda"><ProductPreview /></section>
    <section className="mx-auto max-w-6xl px-5 py-24 md:px-8"><p className="text-center text-xs font-bold uppercase tracking-[.25em] text-product-muted">Hecho para distintos tipos de atención</p><div className="mt-6 flex flex-wrap justify-center gap-2">{RUBROS.map(r => <span key={r} className="rounded-full border border-product-line bg-product-surface px-4 py-2 text-sm text-product-muted">{r}</span>)}</div></section>
    <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8"><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{FEATURES.map(([title, desc]) => <article key={title} className="group rounded-[1.75rem] border border-product-line bg-product-surface p-6 transition hover:-translate-y-1 hover:border-indigo-300/20 hover:bg-white/[.055]"><h2 className="mt-6 text-xl font-black tracking-tight">{title}</h2><p className="mt-2 text-sm leading-6 text-product-muted">{desc}</p></article>)}</div></section>
    <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8"><div className="overflow-hidden rounded-[2.5rem] border border-product-line bg-gradient-to-br from-indigo-500/15 via-white/[.035] to-cyan-400/10 p-7 md:p-12"><div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]"><div><p className="text-xs font-bold uppercase tracking-[.25em] text-product-accent">La marca del negocio primero</p><h2 className="mt-4 text-4xl font-black tracking-[-.05em] md:text-5xl">Una página de reservas que se sienta tuya.</h2><p className="mt-5 max-w-xl leading-7 text-product-muted">Configurá logo, portada y color para que tus clientes reconozcan la página de tu comercio.</p></div><div className="grid grid-cols-2 gap-3">{[['Consultorio', '#38bdf8'], ['Estética', '#f0abfc'], ['Estudio', '#a3e635'], ['Barbería', '#fbbf24']].map(([name, color]) => <div key={name} className="rounded-2xl border border-product-line bg-product-bg p-4"><div className="mb-8 h-8 w-8 rounded-xl" style={{ backgroundColor: color }} /><p className="font-bold">{name}</p><p className="mt-1 text-xs text-product-muted">Identidad adaptable</p></div>)}</div></div></div></section>
    <section className="mx-auto max-w-4xl px-5 pb-24 text-center"><div className="rounded-[2.5rem] border border-indigo-300/15 bg-product-accent/10 px-6 py-14"><h2 className="text-4xl font-black tracking-[-.05em]">Menos coordinación.<br />Más tiempo para atender.</h2><p className="mx-auto mt-4 max-w-xl text-product-muted">Creá tu espacio, configurá servicios y compartí un único enlace de reservas.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={register} className="rounded-2xl bg-product-accent px-7 py-4 font-black text-product-button-ink hover:brightness-90">Empezar con Turnly</button><button onClick={demo} className="rounded-2xl border border-product-line px-7 py-4 font-bold hover:bg-product-subtle">Ver ejemplo de agenda</button></div></div></section>
    <section aria-labelledby="planes" className="mx-auto max-w-5xl space-y-6 px-5 pb-16">
      <h2 id="planes" className="text-3xl font-semibold tracking-tight">Planes</h2>
      <p className="text-product-muted">Probá Turnly durante 14 días sin tarjeta.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="product-card p-6"><h3 className="text-xl font-bold">Básico</h3><p className="mt-2 text-product-muted">Agenda, reservas online y gestión esencial del comercio.</p></article>
        <article className="product-card p-6"><h3 className="text-xl font-bold">Pro</h3><p className="mt-2 text-product-muted">Gestión del comercio, informes, operaciones de caja y notas de clientes.</p></article>
      </div>
    </section>
    <section aria-labelledby="preguntas" className="mx-auto max-w-5xl space-y-3 px-5 pb-16">
      <h2 id="preguntas" className="mb-6 text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
      {[
        ['¿Cómo recibe turnos mi comercio?', 'Configurá servicios, profesionales y horarios. Después compartí tu enlace público.'],
        ['¿Mis clientes necesitan una cuenta?', 'Pueden reservar como invitados y guardar el enlace de gestión para cancelar o reprogramar según tus reglas.'],
        ['¿Qué pasa al terminar la prueba?', 'Conservás tus datos y turnos existentes. Se pausan las reservas nuevas hasta tener un período de acceso vigente.'],
      ].map(([question, answer]) => <details key={question} className="product-card px-5 py-2">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{question}</summary>
        <p className="pb-4 text-product-muted">{answer}</p>
      </details>)}
    </section>
    <footer className="border-t border-product-line"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-8 text-center sm:flex-row sm:text-left md:px-8"><BrandMark compact /><p className="text-xs text-product-muted">Tus turnos, tu equipo y tus clientes, en orden.</p><div className="flex flex-wrap justify-center gap-5 text-xs font-semibold text-product-muted"><button onClick={() => router.push('/privacidad')} className="hover:text-product-ink">Privacidad</button><button onClick={() => router.push('/terminos')} className="hover:text-product-ink">Términos</button><button onClick={() => router.push('/privacidad/solicitudes')} className="hover:text-product-ink">Solicitudes de privacidad</button></div></div></footer>
  </main>
}
