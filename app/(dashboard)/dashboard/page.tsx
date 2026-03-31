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

  const colorPrincipal = getThemeColor(negocio?.tema)
  const plan = (negocio?.suscripcion_tipo ?? 'normal') as keyof typeof LIMITES
  const limites = LIMITES[plan] ?? LIMITES.normal
  const esPro = plan === 'pro'
  const esTrial = plan === 'trial'
  const diasTrial = diasTrialRestantes(negocio?.trial_hasta)

  const navItems = [
    { label: 'Agenda', desc: 'Gestioná tus citas.', href: '/turnos', badge: null, proOnly: false },
    { label: 'Caja', desc: 'Control financiero.', href: (esPro || esTrial) ? '/caja' : '#', badge: (esPro || esTrial) ? null : 'PRO', proOnly: true },
    { label: 'Informes', desc: 'Estadísticas PRO', href: (esPro || esTrial) ? '/informes' : '#', badge: (esPro || esTrial) ? null : 'PRO', proOnly: true },
    { label: 'Clientes', desc: 'Historial y notas.', href: '/clientes', badge: null, proOnly: false },
    { label: 'Servicios', desc: (esPro || esTrial) ? 'Sin límite' : serviciosCount + ' / ' + limites.maxServicios, href: '/servicios', badge: !esPro && !esTrial && serviciosCount >= limites.maxServicios ? 'LÍMITE' : null, proOnly: false },
    { label: 'Staff', desc: (esPro || esTrial) ? 'Sin límite' : staffCount + ' / ' + limites.maxStaff, href: '/staff', badge: !esPro && !esTrial && staffCount >= limites.maxStaff ? 'LÍMITE' : null, proOnly: false },
    { label: 'Ajustes', desc: 'Marca y MP.', href: '/ajustes', badge: null, proOnly: false },
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
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center text-4xl font-black shadow-xl" style={{color: colorPrincipal}}>{negocio?.nombre?.[0]}</div>
            )}
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none" style={{ color: colorPrincipal }}>{negocio?.nombre}</h1>
                {esPro ? <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">PRO</span> : esTrial ? <span className="bg-blue-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">TRIAL · {diasTrial}D</span> : <span className="bg-white/10 text-slate-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">NORMAL</span>}
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Elite Dashboard</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-rose-400 transition-colors bg-white/5 px-6 py-3 rounded-2xl">Cerrar Sesión</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {navItems.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)} className="bg-white/4 p-10 rounded-[3.5rem] border border-white/5 hover:border-white/20 transition-all text-left group relative overflow-hidden active:scale-95 shadow-lg">
              {item.badge && <span className="absolute top-8 right-8 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black uppercase px-3 py-1 rounded-full">{item.badge}</span>}
              <div className="text-5xl mb-6 opacity-40 group-hover:opacity-100 transition-all group-hover:scale-110 origin-left">{ICONS[item.label] || '✨'}</div>
              <h3 className="text-2xl font-black italic uppercase mb-2 tracking-tighter" style={{ color: colorPrincipal }}>{item.label}</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{item.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 p-10 rounded-[3.5rem] border flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden group" style={{ background: colorPrincipal + '10', borderColor: colorPrincipal + '30' }}>
          <div className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-20 transition-opacity group-hover:opacity-40" style={{ backgroundColor: colorPrincipal }} />
          <div className="relative z-10">
            <h4 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white">Tu Link de Reservas</h4>
            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em]">Copiá esto en tu biografía de Instagram</p>
          </div>
          <button onClick={() => {
              if (!negocio?.slug) return
              const url = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://turnly.app') + '/reservar/' + negocio.slug
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
      </div>
    </div>
  )
}
