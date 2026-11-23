'use client'
import { TodayAgenda } from '@/components/dashboard/TodayAgenda'
import { OwnerTasks } from '@/components/dashboard/OwnerTasks'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { daysLeft, type SubscriptionSummary } from '@/lib/commercial-subscription'
import { useRouter } from 'next/navigation'

type NegocioDashboard = {
  id: string; nombre: string; tema?: string
  logo_url?: string; suscripcion_tipo?: string; slug?: string
  trial_hasta?: string | null
  rubro?: string; estilo_visual?: string; modo_visual?: string
}

const ICONS: Record<string, string> = {
  'Agenda': '📅', 'Clientes': '👤', 'Servicios': '✂️',
  'Staff': '👥', 'Informes': '📊', 'Caja': '💰', 'Ajustes': '⚙️', 'Bloqueos': '🔒'
}

export default function DashboardPrincipal() {
  const [negocio, setNegocio] = useState<NegocioDashboard | null>(null)
  const [rol, setRol] = useState<string>('owner')
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let currentRol = 'owner'
      let negocioId = null

      const { data: adminData } = await supabase.from('adminrol').select('negocio_id,role').eq('user_id', user.id).maybeSingle()
      
      if (adminData) {
        currentRol = adminData.role
        negocioId = adminData.negocio_id
      }

      // Si no tiene negocio_id en adminrol, buscamos por owner_id en negocio (fallback)
      if (!negocioId) {
        const { data: negViejo } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        if (negViejo) negocioId = negViejo.id
      }

      setRol(currentRol)

      // FIX: Si es Superadmin, guardamos el estado para mostrarle el botón de volver.
      // Solo lo redirigimos a la fuerza si NO tiene un negocio creado.
      if (currentRol === 'superadmin') {
        setEsSuperAdmin(true)
        if (!negocioId) {
          router.push('/superadmin')
          return
        }
      }

      if (negocioId) {
        const { data: neg, error: negocioError } = await supabase
          .from('negocio')
          .select('id,nombre,logo_url,slug')
          .eq('id', negocioId)
          .maybeSingle()
        if (neg) {
          setNegocio(neg)
          
          if (currentRol !== 'staff') {
            const { data } = await supabase.rpc('turnly_commercial_summary', { business: neg.id })
            setSubscription(data)
          }
        } else if (!negocioError) {
          router.push('/onboarding')
          return
        } else {
          console.error('No se pudo cargar el negocio del panel', negocioError.message)
          setLoadError('No pudimos cargar tu negocio. Reintentá en unos segundos.')
          setLoading(false)
          return
        }
      } else {
        router.push('/onboarding')
        return
      }
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl uppercase tracking-tighter animate-pulse">CARGANDO PANEL...</div>
  if (loadError) return <div className="min-h-screen bg-[#020617] text-white grid place-items-center p-6 text-center"><div><h1 className="text-3xl font-black mb-3">No pudimos abrir el panel</h1><p className="text-slate-400 mb-6">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="rounded-2xl bg-white px-6 py-3 font-black text-slate-950">Reintentar</button></div></div>

  const appearance = {
    background: 'var(--product-bg)', foreground: 'var(--product-ink)', surface: 'var(--product-surface)',
    border: 'var(--product-line)', muted: 'var(--product-muted)', radius: 'var(--product-radius)', tracking: '-.035em',
  }
  const colorPrincipal = 'var(--product-accent)'
  const advanced = subscription?.limits.advanced === true
  const esTrial = subscription?.effectivePlan === 'trial'
  const diasTrial = daysLeft(subscription?.trialEnd ?? null)
  const staffCount = subscription?.usage.staff ?? 0
  const serviciosCount = subscription?.usage.services ?? 0
  const limites = subscription?.limits
  const esStaff = rol === 'staff'

  const navItems = esStaff ? [
    { label: 'Agenda', desc: 'Ver turnos del día.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Clientes', desc: 'Ver base de clientes.', href: '/clientes', badge: null, proOnly: false }
  ] : [
    { label: 'Agenda', desc: 'Gestioná tus citas.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Caja', desc: 'Control financiero.', href: advanced ? '/caja' : '/upgrade', badge: advanced ? null : 'PRO', proOnly: true },
    { label: 'Informes', desc: 'Reservas, cancelaciones y equipo.', href: advanced ? '/informes' : '/upgrade', badge: advanced ? null : 'PRO', proOnly: true },
    { label: 'Clientes', desc: 'Historial y notas.', href: '/clientes', badge: null, proOnly: false },
    { label: 'Servicios', desc: limites ? serviciosCount + ' / ' + limites.services : 'Ver catálogo', href: '/servicios', badge: null, proOnly: false },
    { label: 'Staff', desc: limites ? staffCount + ' / ' + limites.staff : 'Ver equipo', href: '/staff', badge: null, proOnly: false },
    { label: 'Mi suscripción', desc: 'Consultar plan y vencimiento.', href: '/upgrade', badge: null, proOnly: false },
    { label: 'Ajustes', desc: 'Marca y MP.', href: '/ajustes', badge: null, proOnly: false },
    { label: 'Bloqueos', desc: 'Bloquear horarios.', href: '/bloqueos', badge: null, proOnly: false },
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-12 font-sans transition-colors" style={{ background: appearance.background, color: appearance.foreground }}>
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12 border-b pb-8 sm:pb-10" style={{ borderColor: appearance.border }}>
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {negocio?.logo_url ? (
              <Image src={negocio.logo_url} alt={`Logo de ${negocio.nombre}`} width={80} height={80} unoptimized className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain p-2 border shadow-xl" style={{ borderRadius: appearance.radius, background: appearance.surface, borderColor: appearance.border }} />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border flex items-center justify-center text-3xl sm:text-4xl font-black shadow-xl" style={{ color: colorPrincipal, borderRadius: appearance.radius, background: appearance.surface, borderColor: appearance.border }}>{negocio?.nombre?.[0]}</div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                <h1 className="text-3xl sm:text-5xl font-black uppercase italic leading-none break-words" style={{ color: colorPrincipal, letterSpacing: appearance.tracking }}>{negocio?.nombre}</h1>
                {esSuperAdmin ? <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-rose-500/20">SUPERADMIN</span> : esStaff ? <span className="bg-slate-500/20 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full">STAFF</span> : subscription?.effectivePlan === 'pro' ? <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">PRO</span> : esTrial ? <span className="bg-blue-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">TRIAL · {diasTrial}D</span> : <span className="bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase px-3 py-1 rounded-full">{subscription?.effectivePlan === 'basico' ? 'Básico' : subscription ? 'Sin período vigente' : 'Estado sin verificar'}</span>}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: appearance.muted }}>Panel de gestión</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {esSuperAdmin && (
              <button onClick={() => router.push('/superadmin')} className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors px-6 py-3 rounded-2xl">
                Administración
              </button>
            )}
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase tracking-widest transition-colors px-6 py-3 border" style={{ color: appearance.muted, background: appearance.surface, borderColor: appearance.border, borderRadius: appearance.radius }}>
              Cerrar Sesión
            </button>
          </div>
        </header>

        {negocio && <TodayAgenda key={negocio.id} business={negocio.id} />}
        {!esStaff && negocio && <OwnerTasks business={negocio.id} />}
        {esTrial && diasTrial <= 7 && !esStaff && !esSuperAdmin && (
          <div className="mb-10 p-8 rounded-[3rem] border border-blue-500/30 bg-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-blue-500/15 transition-all">
            <div>
              <p className="font-black uppercase text-xl text-blue-400 mb-1 tracking-tight">TRIAL TERMINA EN {diasTrial} DÍA{diasTrial !== 1 ? 'S' : ''}</p>
              <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest">Al vencer la prueba se pausan las reservas nuevas. Conservás tu agenda y tus datos.</p>
            </div>
            <button onClick={() => router.push('/upgrade')} className="text-[10px] font-black uppercase text-black bg-blue-400 px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20">Ver mi plan</button>
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 ${esStaff ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-5`}>
          {navItems.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)} className="p-7 sm:p-10 border transition-all text-left group relative overflow-hidden active:scale-95 shadow-lg hover:-translate-y-1" style={{ background: appearance.surface, borderColor: appearance.border, borderRadius: appearance.radius }}>
              {item.badge && <span className="absolute top-8 right-8 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-3 py-1 rounded-full">{item.badge}</span>}
              <div className="text-5xl mb-6 opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110 origin-left">{ICONS[item.label] || '✨'}</div>
              <h3 className="text-2xl font-black italic uppercase mb-2 tracking-tighter" style={{ color: colorPrincipal }}>{item.label}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: appearance.muted }}>{item.desc}</p>
            </button>
          ))}
        </div>

        {!esStaff && negocio?.slug && (
          <div className="mt-12 p-7 sm:p-10 border flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 shadow-2xl relative overflow-hidden group" style={{ background: 'var(--product-subtle)', borderColor: 'var(--product-line)', borderRadius: appearance.radius }}>
            <div className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: colorPrincipal }} />
            <div className="relative z-10">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Tu enlace de reservas</h4>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: appearance.muted }}>Compartilo en Instagram, WhatsApp o tu sitio</p>
            </div>
            <a className="relative z-10 underline" href={'/reservar/' + encodeURIComponent(negocio.slug)} target="_blank" rel="noopener noreferrer">Abrir página de reservas</a>
            <button onClick={async () => {
                const url = window.location.origin + '/reservar/' + negocio.slug
                try {
                  await navigator.clipboard.writeText(url)
                  setCopyError(false)
                  setCopiado(true)
                  setTimeout(() => setCopiado(false), 2000)
                } catch {
                  setCopiado(false)
                  setCopyError(true)
                }
              }}
              className="relative z-10 px-5 sm:px-8 py-5 border font-mono text-xs sm:text-sm transition-all flex flex-wrap items-center justify-between gap-4 shadow-inner max-w-full" style={{ background: appearance.surface, borderColor: appearance.border, borderRadius: appearance.radius }}>
              <span className="break-all" style={{ color: colorPrincipal }}>{'/reservar/' + negocio?.slug}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${copiado ? "bg-emerald-500/20 text-emerald-400" : "border"}`}>
                {copiado ? "¡COPIADO!" : "COPIAR"}
              </span>
            </button>
            {copyError && <p role="status">Abrí la página de reservas y copiá la dirección desde el navegador.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
