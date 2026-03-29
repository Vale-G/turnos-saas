'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { getNegocioDelUsuario } from '@/lib/getnegocio'

const FEATURES_BASICO = [
  'Reservas online ilimitadas',
  '2 barberos, 5 servicios',
  'Agenda y cobros',
  'WhatsApp al confirmar',
]

const FEATURES_PRO = [
  'Todo lo del plan Basico',
  'Staff y servicios ilimitados',
  'Informes y estadisticas PRO',
  'Historial completo de clientes',
  'Cobros con MercadoPago',
  'Recordatorios automaticos',
]

function Check({ color }: { color: string }) {
  return (
    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: color + '25' }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4l1.5 1.5 3.5-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function UpgradeContent() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [negocio, setNegocio] = useState<{ nombre: string; tema?: string; suscripcion_tipo?: string } | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState('#6366F1')
  const [precios, setPrecios] = useState({ basico: 5000, pro: 25000 })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const estado = searchParams.get('suscripcion')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const neg = await getNegocioDelUsuario(user.id)
      if (neg) { setNegocio(neg); setColorPrincipal(getThemeColor(neg.tema)) }

      // Cargar precios desde Config
      const { data: configs } = await supabase
        .from('config').select('clave, valor')
        .in('clave', ['precio_basico', 'precio_pro'])
      if (configs) {
        const pm: Record<string, number> = {}
        configs.forEach((c: { clave: string; valor: string }) => { pm[c.clave] = Number(c.valor) })
        setPrecios({
          basico: pm.precio_basico ?? 5000,
          pro: pm.precio_pro ?? 25000,
        })
      }
    }
    init()
  }, [router])

  const handlePago = async (plan: 'basico' | 'pro') => {
    setLoadingPlan(plan)
    setError(null)
    try {
      const res = await fetch('/api/suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Error') }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoadingPlan(null)
    }
  }

  const planActual = negocio?.suscripcion_tipo ?? ''

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.push('/dashboard')}
            className="text-slate-500 text-[10px] font-black uppercase mb-3 block hover:text-white transition-colors">
            Volver al panel
          </button>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter" style={{ color: colorPrincipal }}>
            Planes Turnly
          </h1>
          <p className="text-slate-500 text-sm mt-1">Para {negocio?.nombre ?? 'tu negocio'}</p>
        </div>

        {estado === 'ok' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center mb-6">
            <p className="text-emerald-400 font-black uppercase">Pago aprobado — tu plan se activa en segundos</p>
          </div>
        )}
        {estado === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center mb-6">
            <p className="text-red-400 font-black uppercase">Pago rechazado — intenta de nuevo</p>
          </div>
        )}
        {estado === 'pendiente' && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4 text-center mb-6">
            <p className="text-amber-400 font-black uppercase">Pago en proceso — te avisamos cuando se acredite</p>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* BASICO */}
          <div className="bg-white/4 border border-white/8 rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/8">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Plan Basico</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  ${precios.basico.toLocaleString('es-AR')}
                </span>
                <span className="text-slate-400 text-sm">ARS / mes</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">Para negocios que estan empezando</p>
            </div>
            <div className="p-6 space-y-2.5 flex-1">
              {FEATURES_BASICO.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <Check color="#94A3B8" />
                  <span className="text-sm text-slate-400">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              {planActual === 'basico' ? (
                <div className="w-full py-3 rounded-2xl text-center text-slate-500 border border-white/10 text-sm font-black uppercase">
                  Plan actual
                </div>
              ) : (
                <button onClick={() => handlePago('basico')} disabled={!!loadingPlan}
                  className="w-full py-4 rounded-2xl font-black italic text-base text-white border border-white/20 hover:bg-white/10 transition-all disabled:opacity-50">
                  {loadingPlan === 'basico' ? 'Redirigiendo...' : 'Elegir Basico'}
                </button>
              )}
            </div>
          </div>

          {/* PRO */}
          <div className="bg-white/4 rounded-[2rem] overflow-hidden flex flex-col border-2"
            style={{ borderColor: colorPrincipal + '50' }}>
            <div className="absolute-free">
              <div className="flex items-center justify-between p-6 border-b border-white/8"
                style={{ background: colorPrincipal + '12' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colorPrincipal }}>Plan Pro</p>
                    <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Recomendado</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black" style={{ color: colorPrincipal }}>
                      ${precios.pro.toLocaleString('es-AR')}
                    </span>
                    <span className="text-slate-400 text-sm">ARS / mes</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Para negocios que quieren crecer</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-2.5 flex-1">
              {FEATURES_PRO.map(f => (
                <div key={f} className="flex items-center gap-3">
                  <Check color="#22C55E" />
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              {planActual === 'pro' ? (
                <div className="w-full py-3 rounded-2xl text-center font-black uppercase text-sm text-emerald-400 border border-emerald-500/20 bg-emerald-500/10">
                  Plan activo
                </div>
              ) : (
                <button onClick={() => handlePago('pro')} disabled={!!loadingPlan}
                  className="w-full py-4 rounded-2xl font-black italic text-base text-black transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colorPrincipal }}>
                  {loadingPlan === 'pro' ? 'Redirigiendo...' : 'Activar Pro con MercadoPago'}
                </button>
              )}
            </div>
          </div>

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Pago seguro via MercadoPago · Podes cancelar cuando quieras
        </p>
      </div>
    </div>
  )
}

export default function UpgradePro() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-500 font-black italic uppercase animate-pulse">Cargando...</div>
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  )
}
