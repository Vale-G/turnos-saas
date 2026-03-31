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
  'Staff': '👥', 'Informes': '📊', 'Ajustes': '⚙️', 'Bloqueos': '🔒'
}

export default function DashboardPrincipal() {
  const [negocio, setNegocio] = useState<NegocioDashboard | null>(null)
  const [staffCount, setStaffCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: neg } = await supabase.from('negocio').select('*').eq('owner_id', user.id).single()

      if (neg) {
        setNegocio(neg)
        const [{ count: sc }, { count: svc }] = await Promise.all([
          supabase.from('staff').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
          supabase.from('servicio').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
        ])
        setStaffCount(sc ?? 0)
        setServiciosCount(svc ?? 0)
      }
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl uppercase tracking-tighter animate-pulse">CARGANDO PANEL...</div>

  const colorP = getThemeColor(negocio?.tema)
  const plan = (negocio?.suscripcion_tipo ?? 'normal') as keyof typeof LIMITES
  const limites = LIMITES[plan] ?? LIMITES.normal
  const esPro = plan === 'pro'
  const esTrial = plan === 'trial'
  const diasTrial = diasTrialRestantes(negocio?.trial_hasta)

  const navItems = [
    { label: 'Agenda', desc: 'Gestioná tus citas.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Clientes', desc: 'Historial y notas.', href: '/clientes', badge: null, proOnly: false },
    { label: 'Servicios', desc: (esPro || esTrial) ? 'Sin límite' : serviciosCount + ' / ' + limites.maxServicios, href: '/servicios', badge: !esPro && !esTrial && serviciosCount >= limites.maxServicios ? 'LÍMITE' : null, proOnly: false },
    { label: 'Staff', desc: (esPro || esTrial) ? 'Sin límite' : staffCount + ' / ' + limites.maxStaff, href: '/staff', badge: !esPro && !esTrial && staffCount >= limites.maxStaff ? 'LÍMITE' : null, proOnly: false },
    { label: 'Informes', desc: (esPro || esTrial) ? 'Estadísticas PRO' : 'Solo plan Pro', href: (esPro || esTrial) ? '/informes' : '#', badge: (esPro || esTrial) ? null : 'PRO', proOnly: true },
    { label: 'Ajustes', desc: 'Marca y estilo.', href: '/ajustes', badge: null, proOnly: false },
    { label: 'Bloqueos', desc: 'Bloquear horarios.', href: '/bloqueos', badge: null, proOnly: false },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            {negocio?.logo_url ? (
              <Image src={negocio.logo_url} alt="Logo" width={80} height={80} unoptimized className="w-20 h-20 object-contain rounded-[2rem] bg-white/5 p-2 border border-white/10 shadow-xl" />
            ) : (
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center text-4xl font-black shadow-xl" style={{color: colorP}}>{negocio?.nombre?.[0]}</div>
            )}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none" style={{ color: colorP }}>{negocio?.nombre}</h1>
                {esPro ? <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg shadow-amber-400/20">PRO</span> : esTrial ? <span className="bg-blue-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">TRIAL · {diasTrial}D</span> : <span className="bg-white/10 text-slate-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">NORMAL</span>}
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Elite Dashboard</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-rose-400 transition-colors bg-white/5 px-6 py-3 rounded-2xl">Cerrar Sesión</button>
        </header>

        {esTrial && diasTrial <= 7 && (
          <div className="mb-10 p-8 rounded-[3rem] border border-blue-500/30 bg-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-blue-500/15 transition-all" onClick={() => router.push('/upgrade')}>
            <div>
              <p className="font-black uppercase text-xl text-blue-400 mb-1 tracking-tight">TRIAL TERMINA EN {diasTrial} DÍA{diasTrial !== 1 ? 'S' : ''}</p>
              <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest">Activá tu plan PRO para no perder acceso al sistema.</p>
            </div>
            <span className="text-[10px] font-black uppercase text-black bg-blue-400 px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20">Ver Planes</span>
          </div>
        )}

        {!esPro && !esTrial && (
          <div className="mb-10 p-8 rounded-[3rem] border border-amber-400/30 bg-amber-400/10 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-amber-400/15 transition-all" onClick={() => router.push('/upgrade')}>
            <div>
              <p className="font-black uppercase text-xl text-amber-400 mb-1 tracking-tight">PLAN NORMAL LIMITADO</p>
              <p className="text-amber-200/60 text-xs font-bold uppercase tracking-widest">Upgrade a PRO para desbloquear staff ilimitado e informes financieros.</p>
            </div>
            <span className="text-[10px] font-black uppercase text-black bg-amber-400 px-6 py-3 rounded-2xl shadow-lg shadow-amber-400/20">Upgrade PRO</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navItems.map(item => (
            <button key={item.href} onClick={() => router.push(item.href)} className="bg-white/4 p-10 rounded-[3.5rem] border border-white/5 hover:border-white/20 transition-all text-left group relative overflow-hidden active:scale-95 shadow-lg">
              {item.badge && <span className="absolute top-8 right-8 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-3 py-1 rounded-full">{item.badge}</span>}
              <div className="text-5xl mb-6 opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110 origin-left">{ICONS[item.label] || '✨'}</div>
              <h3 className="text-3xl font-black italic uppercase mb-2 tracking-tighter" style={{ color: colorP }}>{item.label}</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{item.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 p-10 rounded-[3.5rem] border flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden group" style={{ background: colorP + '10', borderColor: colorP + '30' }}>
          <div className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: colorP }} />
          <div className="relative z-10">
            <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Tu Link de Reservas</h4>
            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">Copiá esto en tu biografía de Instagram</p>
          </div>
          <button onClick={() => {
              if (!negocio?.slug) return
              const url = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://turnos-saas-eight.vercel.app') + '/reservar/' + negocio.slug
              navigator.clipboard.writeText(url)
              setCopiado(true); setTimeout(() => setCopiado(false), 2000)
            }}
            className="relative z-10 bg-black/60 px-8 py-5 rounded-[2rem] border border-white/10 font-mono text-sm hover:border-white/30 transition-all flex items-center gap-4 shadow-inner">
            <span style={{ color: colorP }}>{'/reservar/' + negocio?.slug}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${copiado ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white"}`}>
              {copiado ? "¡COPIADO!" : "COPIAR"}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
