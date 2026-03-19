'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { LIMITES } from '@/lib/permisos'
import { useRouter } from 'next/navigation'

type NegocioDashboard = {
  id: string; nombre: string; tema?: string
  logo_url?: string; suscripcion_tipo?: string; slug?: string
}

export default function DashboardPrincipal() {
  const [negocio, setNegocio] = useState<NegocioDashboard | null>(null)
  const [staffCount, setStaffCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Buscar negocio por owner_id o por id (compatibilidad)
      let neg = null
      const { data: byOwner } = await supabase.from('Negocio').select('*').eq('owner_id', user.id).single()
      if (byOwner) {
        neg = byOwner
      } else {
        const { data: byId } = await supabase.from('Negocio').select('*').eq('id', user.id).single()
        neg = byId
      }

      if (neg) {
        setNegocio(neg)
        // Cargar contadores para mostrar límites
        const [{ count: sc }, { count: svc }] = await Promise.all([
          supabase.from('Staff').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
          supabase.from('Servicio').select('*', { count: 'exact', head: true }).eq('negocio_id', neg.id),
        ])
        setStaffCount(sc ?? 0)
        setServiciosCount(svc ?? 0)
      }
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  if (loading) return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-black uppercase italic text-emerald-500 animate-pulse">
      Cargando...
    </div>
  )

  const colorPrincipal = getThemeColor(negocio?.tema)
  const plan = (negocio?.suscripcion_tipo ?? 'normal') as 'normal' | 'pro'
  const limites = LIMITES[plan]
  const esPro = plan === 'pro'

  const navItems = [
    {
      label: 'Agenda',
      desc: 'Gestioná tus citas.',
      href: '/turnos',
      badge: null,
      proOnly: false,
    },
    {
      label: 'Clientes',
      desc: 'Historial y notas.',
      href: '/clientes',
      badge: null,
      proOnly: false,
    },
    {
      label: 'Servicios',
      desc: esPro ? 'Sin límite' : serviciosCount + ' / ' + limites.maxServicios,
      href: '/servicios',
      badge: !esPro && serviciosCount >= limites.maxServicios ? 'LÍMITE' : null,
      proOnly: false,
    },
    {
      label: 'Staff',
      desc: esPro ? 'Sin límite' : staffCount + ' / ' + limites.maxStaff,
      href: '/staff',
      badge: !esPro && staffCount >= limites.maxStaff ? 'LÍMITE' : null,
      proOnly: false,
    },
    {
      label: 'Informes',
      desc: esPro ? 'Estadísticas PRO' : 'Solo plan Pro',
      href: esPro ? '/informes' : '#',
      badge: esPro ? null : 'PRO',
      proOnly: true,
    },
    {
      label: 'Ajustes',
      desc: 'Marca y estilo.',
      href: '/ajustes',
      badge: null,
      proOnly: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
          <div className="flex items-center gap-5">
            {negocio?.logo_url ? (
              <Image src={negocio.logo_url} alt="Logo" width={72} height={72} unoptimized
                className="w-18 h-18 object-contain rounded-2xl bg-white/5 p-2 border border-white/10" />
            ) : (
              <div className="w-16 h-16 bg-white/5 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-[10px] text-slate-500 uppercase font-black text-center">
                Logo
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter"
                  style={{ color: colorPrincipal }}>
                  {negocio?.nombre}
                </h1>
                {esPro ? (
                  <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-full">
                    PRO
                  </span>
                ) : (
                  <span className="bg-white/10 text-white/40 text-[9px] font-black uppercase px-2 py-1 rounded-full">
                    NORMAL
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Panel de administración
              </p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-[10px] font-black uppercase text-slate-600 hover:text-red-400 transition-colors">
            Salir
          </button>
        </header>

        {/* Banner upgrade si es plan normal */}
        {!esPro && (
          <div className="mb-8 p-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 flex items-center justify-between gap-4">
            <div>
              <p className="font-black uppercase text-sm text-amber-400">Plan Normal</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Hasta {limites.maxStaff} barberos y {limites.maxServicios} servicios.
                Upgrade a Pro para desbloquear todo.
              </p>
            </div>
            <span className="text-[10px] font-black uppercase text-amber-400/50 border border-amber-400/20 px-3 py-1.5 rounded-xl">
              Plan Pro
            </span>
          </div>
        )}

        {/* Grid de accesos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {navItems.map(item => (
            <div key={item.href} onClick={() => router.push(item.href)}
              className="bg-white/4 p-7 rounded-[2.5rem] border border-white/5 hover:border-white/15 transition-all cursor-pointer group relative overflow-hidden">
              {item.badge && (
                <span className="absolute top-4 right-4 bg-red-500/20 text-red-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/20">
                  {item.badge}
                </span>
              )}
              <h3 className="text-2xl font-black italic uppercase mb-1 group-hover:translate-x-0.5 transition-transform"
                style={{ color: colorPrincipal }}>
                {item.label}
              </h3>
              <p className="text-slate-500 text-xs font-bold">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Link público */}
        <div className="mt-10 p-6 rounded-[2.5rem] border flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ background: colorPrincipal + '08', borderColor: colorPrincipal + '18' }}>
          <div>
            <h4 className="text-base font-black uppercase italic tracking-tight">Tu Link de Reservas</h4>
            <p className="text-slate-500 text-sm mt-0.5">Pegalo en tu Instagram.</p>
          </div>
          <button
            onClick={() => negocio?.slug && navigator.clipboard.writeText('https://barbucho.app/' + negocio.slug)}
            className="bg-black/50 px-5 py-3 rounded-xl border border-white/10 font-mono text-sm hover:border-white/25 transition-colors flex items-center gap-3 group"
            style={{ color: colorPrincipal }}>
            {'barbucho.app/' + negocio?.slug}
            <span className="text-[9px] text-slate-600 group-hover:text-white font-black uppercase transition-colors">
              copiar
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
