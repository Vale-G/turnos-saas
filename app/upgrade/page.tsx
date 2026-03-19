'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'

// Precio se carga desde la DB via Config

function UpgradeContent() {
  const [loading, setLoading] = useState(false)
  const [negocio, setNegocio] = useState<{ nombre: string; tema?: string; suscripcion_tipo?: string } | null>(null)
  const [colorPrincipal, setColorPrincipal] = useState('#6366F1')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const estado = searchParams.get('suscripcion')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      let neg = null
      const { data: byOwner } = await supabase.from('Negocio').select('nombre, tema, suscripcion_tipo').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else {
        const { data: byId } = await supabase.from('Negocio').select('nombre, tema, suscripcion_tipo').eq('id', user.id).single()
        neg = byId
      }
      if (neg) {
        setNegocio(neg)
        setColorPrincipal(getThemeColor(neg.tema))
        if (neg.suscripcion_tipo === 'pro') router.push('/dashboard')
      }
    }
    init()
  }, [router])

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/suscripcion', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al crear el pago')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">

        {estado === 'ok' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center">
            <p className="text-emerald-400 font-black text-lg uppercase italic">Pago aprobado</p>
            <p className="text-slate-400 text-sm mt-1">Tu plan Pro se activa en segundos.</p>
          </div>
        )}
        {estado === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center">
            <p className="text-red-400 font-black uppercase">Pago rechazado</p>
            <p className="text-slate-400 text-sm mt-1">Intenta de nuevo o usa otro medio de pago.</p>
          </div>
        )}
        {estado === 'pendiente' && (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-5 text-center">
            <p className="text-amber-400 font-black uppercase">Pago en proceso</p>
            <p className="text-slate-400 text-sm mt-1">Te avisamos cuando se acredite.</p>
          </div>
        )}

        <div className="bg-white/4 border border-white/8 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 text-center border-b border-white/8">
            <span className="bg-amber-400 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">
              Plan Pro
            </span>
            <div className="mt-4">
              <span className="text-5xl font-black" style={{ color: colorPrincipal }}>
                ${PRECIO.toLocaleString('es-AR')}
              </span>
              <span className="text-slate-400 text-sm ml-2">ARS / mes</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">Para {negocio?.nombre ?? 'tu negocio'}</p>
          </div>

          <div className="p-6 space-y-3">
            {[
              'Staff y servicios ilimitados',
              'Informes y estadisticas avanzadas',
              'Historial completo de clientes',
              'Cobros con MercadoPago integrado',
              'Soporte prioritario',
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>

          <div className="px-6 pb-6">
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                {error}
              </p>
            )}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-5 rounded-2xl font-black italic text-lg text-black transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colorPrincipal }}>
              {loading ? 'Redirigiendo a MercadoPago...' : 'Activar Plan Pro'}
            </button>
            <p className="text-[10px] text-slate-600 text-center mt-3">
              Pago seguro via MercadoPago. Podes cancelar cuando quieras.
            </p>
          </div>
        </div>

        <button onClick={() => router.push('/dashboard')}
          className="w-full text-slate-600 hover:text-slate-400 text-xs font-black uppercase transition-colors">
          Volver al panel
        </button>
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
