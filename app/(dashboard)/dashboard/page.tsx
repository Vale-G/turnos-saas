'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { LIMITES } from '@/lib/permisos'
import { diasTrialRestantes } from '@/lib/planes'
import { useRouter } from 'next/navigation'

type NegocioDashboard = {
  id: string; nombre: string; tema?: string
  logo_url?: string; suscripcion_tipo?: string; slug?: string
  trial_hasta?: string | null
}

const ICONS: Record<string, string> = {
  'Agenda': '📅', 'Clientes': '👤', 'Servicios': '✂️',
  'Staff': '👥', 'Informes': '📊', 'Caja': '💰', 'Ajustes': '⚙️', 'Bloqueos': '🔒'
}

export default function DashboardPrincipal() {
  const [negocio, setNegocio] = useState<NegocioDashboard | null>(null)
  const [rol, setRol] = useState<string>('owner')
  const [esSuperAdmin, setEsSuperAdmin] = useState(false)
  const [staffCount, setStaffCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let currentRol = 'owner'
      let negocioId = null

      const { data: adminData } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      
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
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', negocioId).maybeSingle()
        if (neg) {
          const diasRestantes = diasTrialRestantes(neg.trial_hasta)
          // Si es superadmin, no lo bloqueamos nunca con el paywall
          if (currentRol !== 'superadmin') {
            if (neg.suscripcion_tipo === 'trial' && diasRestantes < 0) {
              router.push('/negocio-inactivo')
              return
            }
            if (neg.suscripcion_tipo === 'inactiva' || neg.suscripcion_tipo === 'vencida') {
               router.push('/negocio-inactivo')
               return
            }
          }

          setNegocio(neg)
          
          if (currentRol === 'owner' || currentRol === 'superadmin') {
             const [{ count: sc }, { count: svc }] = await Promise.all([
               supabase.from('staff').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
               supabase.from('servicio').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
             ])
             setStaffCount(sc ?? 0)
             setServiciosCount(svc ?? 0)
          }
        } else {
          router.push('/onboarding')
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

  const colorPrincipal = getThemeColor(negocio?.tema)
  const plan = (negocio?.suscripcion_tipo ?? 'normal') as keyof typeof LIMITES
  const limites = LIMITES[plan] ?? LIMITES.normal
  const esPro = plan === 'pro'
  const esTrial = plan === 'trial'
  const diasTrial = diasTrialRestantes(negocio?.trial_hasta)
  const esStaff = rol === 'staff'

  const navItems = esStaff ? [
    { label: 'Agenda', desc: 'Ver turnos del día.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Clientes', desc: 'Ver base de clientes.', href: '/clientes', badge: null, proOnly: false }
  ] : [
    { label: 'Agenda', desc: 'Gestioná tus citas.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Caja', desc: 'Control financiero.', href: (esPro || esTrial || esSuperAdmin) ? '/caja' : '#', badge: (esPro || esTrial || esSuperAdmin) ? null : 'PRO', proOnly: true },
    { label: 'Informes', desc: 'Estadísticas PRO', href: (esPro || esTrial || esSuperAdmin) ? '/informes' : '#', badge: (esPro || esTrial || esSuperAdmin) ? null : 'PRO', proOnly: true },
    { label: 'Clientes', desc: 'Historial y notas.', href: '/clientes', badge: null, proOnly: false },
    { label: 'Servicios', desc: (esPro || esTrial || esSuperAdmin) ? 'Sin límite' : serviciosCount + ' / ' + limites.maxServicios, href: '/servicios', badge: !esPro && !esTrial && !esSuperAdmin && serviciosCount >= limites.maxServicios ? 'LÍMITE' : null, proOnly: false },
    { label: 'Staff', desc: (esPro || esTrial || esSuperAdmin) ? 'Sin límite' : staffCount + ' / ' + limites.maxStaff, href: '/staff', badge: !esPro && !esTrial && !esSuperAdmin && staffCount >= limites.maxStaff ? 'LÍMITE' : null, proOnly: false },
    { label: 'Ajustes', desc: 'Marca y MP.', href: '/ajustes', badge: null, proOnly: false },
    { label: 'Bloqueos', desc: 'Bloquear horarios.', href: '/bloqueos', badge: null, proOnly: false },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            {negocio?.logo_url ? (
              <Image src={negocio.logo_url} alt="Logo" width={80} height={80} unoptimized className="w-20 h-20 object-contain rounded-[2rem] bg-white/5 p-2 border border-white/10 shadow-xl" />
            ) : (
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center text-4xl font-black shadow-xl" style={{color: colorPrincipal}}>{negocio?.nombre?.[0]}</div>
            )}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none" style={{ color: colorPrincipal }}>{negocio?.nombre}</h1>
                {esSuperAdmin ? <span className="bg-primary text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-rose-500/20">DIOS</span> : esStaff ? <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">STAFF</span> : esPro ? <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">PRO</span> : esTrial ? <span className="bg-blue-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">TRIAL · {diasTrial}D</span> : <span className="bg-white/10 text-slate-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">NORMAL</span>}
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Elite Dashboard</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {esSuperAdmin && (
              <button onClick={() => router.push('/superadmin')} className="text-[10px] font-black uppercase tracking-widest text-rose-400 bg-primary/10 hover:bg-primary/20 border border-rose-500/30 transition-colors px-6 py-3 rounded-2xl">
                Modo Dios
              </button>
            )}
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-colors bg-white/5 px-6 py-3 rounded-2xl">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {esTrial && diasTrial <= 7 && !esStaff && !esSuperAdmin && (
          <div className="mb-10 p-8 rounded-[3rem] border border-blue-500/30 bg-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-blue-500/15 transition-all">
            <div>
              <p className="font-black uppercase text-xl text-blue-400 mb-1 tracking-tight">TRIAL TERMINA EN {diasTrial} DÍA{diasTrial !== 1 ? 'S' : ''}</p>
              <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest">Activá tu plan PRO para no perder acceso al sistema.</p>
            </div>
            <button onClick={() => window.open('https://wa.me/5491123456789?text=Hola,%20quiero%20pasar%20a%20PRO', '_blank')} className="text-[10px] font-black uppercase text-black bg-blue-400 px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20">Contactar</button>
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 ${esStaff ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-5`}>
          {navItems.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)} className="bg-white/4 p-10 rounded-[3.5rem] border border-white/5 hover:border-white/20 transition-all text-left group relative overflow-hidden active:scale-95 shadow-lg">
              {item.badge && <span className="absolute top-8 right-8 bg-primary/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-3 py-1 rounded-full">{item.badge}</span>}
              <div className="text-5xl mb-6 opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110 origin-left">{ICONS[item.label] || '✨'}</div>
              <h3 className="text-2xl font-black italic uppercase mb-2 tracking-tighter" style={{ color: colorPrincipal }}>{item.label}</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{item.desc}</p>
            </button>
          ))}
        </div>

        {!esStaff && (
          <div className="mt-12 p-10 rounded-[3.5rem] border flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden group" style={{ background: colorPrincipal + '10', borderColor: colorPrincipal + '30' }}>
            <div className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: colorPrincipal }} />
            <div className="relative z-10">
              <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Tu Link de Reservas</h4>
              <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">Copiá esto en tu biografía de Instagram</p>
            </div>
            <button onClick={() => {
                if (!negocio?.slug) return
                const url = window.location.origin + '/reservar/' + negocio.slug
                navigator.clipboard.writeText(url)
                setCopiado(true); setTimeout(() => setCopiado(false), 2000)
              }}
              className="relative z-10 bg-black/60 px-8 py-5 rounded-[2rem] border border-white/10 font-mono text-sm hover:border-white/30 transition-all flex items-center gap-4 shadow-inner">
              <span style={{ color: colorPrincipal }}>{'/reservar/' + negocio?.slug}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${copiado ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white"}`}>
                {copiado ? "¡COPIADO!" : "COPIAR"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
