'use client'

import { diasTrialRestantes } from '@/lib/planes'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function SuperAdminElite() {
  const [negocios, setNegocios] = useState<any[]>([])
  const [configEdit, setConfigEdit] = useState({
    precio_basico: 5000,
    precio_pro: 25000,
    dias_trial: 14,
  })
  const [loading, setLoading] = useState(true)
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'metricas' | 'negocios' | 'config'>(
    'metricas'
  )
  const [negocioDetalle, setNegocioDetalle] = useState<string | null>(null)
  const router = useRouter()

  const cargarDatos = useCallback(async () => {
    const { data: negs } = await supabase
      .from('negocio')
      .select('*')
      .order('created_at', { ascending: false })
    setNegocios(negs || [])

    const { data: cfg } = await supabase.from('config').select('*')
    if (cfg) {
      const configMap: any = {}
      cfg.forEach((r) => {
        configMap[r.clave] = Number(r.valor)
      })
      setConfigEdit({
        precio_basico: configMap.precio_basico || 5000,
        precio_pro: configMap.precio_pro || 25000,
        dias_trial: configMap.dias_trial || 14,
      })
    }
  }, [])

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: rol } = await supabase
        .from('adminrol')
        .select('role')
        .eq('user_id', user.id)
        .single()
      if (rol?.role !== 'superadmin') {
        toast.error('Acceso denegado')
        router.push('/dashboard')
        return
      }

      await cargarDatos()
      setLoading(false)
    }
    init()
  }, [router, cargarDatos])

  const guardarConfig = async () => {
    setGuardandoConfig(true)
    const updates = [
      { clave: 'precio_basico', valor: String(configEdit.precio_basico) },
      { clave: 'precio_pro', valor: String(configEdit.precio_pro) },
      { clave: 'dias_trial', valor: String(configEdit.dias_trial) },
    ]
    for (const u of updates) {
      await supabase.from('config').upsert(u, { onConflict: 'clave' })
    }
    toast.success('Precios y Configuración actualizados en vivo')
    setGuardandoConfig(false)
  }

  const togglePlan = async (id: string, actual: string) => {
    const nuevo = actual === 'pro' ? 'normal' : 'pro'
    await supabase
      .from('negocio')
      .update({ suscripcion_tipo: nuevo })
      .eq('id', id)
    setNegocios(
      negocios.map((n) => (n.id === id ? { ...n, suscripcion_tipo: nuevo } : n))
    )
    toast.success(`Plan cambiado a ${nuevo.toUpperCase()}`)
  }

  const extenderTrial = async (id: string, dias: number) => {
    const nuevo = new Date()
    nuevo.setDate(nuevo.getDate() + dias)
    await supabase
      .from('negocio')
      .update({ trial_hasta: nuevo.toISOString() })
      .eq('id', id)
    setNegocios(
      negocios.map((n) =>
        n.id === id ? { ...n, trial_hasta: nuevo.toISOString() } : n
      )
    )
    toast.success('Trial extendido')
  }

  const eliminarNegocio = async (id: string, nombre: string) => {
    if (prompt(`Escribí BORRAR para fulminar a ${nombre}`) !== 'BORRAR') return
    await supabase.from('negocio').delete().eq('id', id)
    setNegocios(negocios.filter((n) => n.id !== id))
    toast.success('Negocio fulminado')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-rose-500 text-3xl animate-pulse tracking-widest uppercase">
        ACCESO DIOS...
      </div>
    )
  }

  const metricas = {
    total: negocios.length,
    pro: negocios.filter((n) => n.suscripcion_tipo === 'pro').length,
    trial: negocios.filter((n) => n.suscripcion_tipo === 'trial').length,
    mrr:
      negocios.filter((n) => n.suscripcion_tipo === 'pro').length *
        configEdit.precio_pro +
      negocios.filter((n) => n.suscripcion_tipo === 'basico').length *
        configEdit.precio_basico,
  }

  const filtrados = negocios.filter(
    (n) =>
      n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.slug.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-rose-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-rose-500/20 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-[0.4em] mb-2">
              Nivel de Acceso: Dios
            </p>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter">
              Super<span className="text-rose-500">Admin</span>
            </h1>
          </div>
          <div className="flex gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
            {(['metricas', 'negocios', 'config'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                  vista === v
                    ? 'bg-rose-500 text-black shadow-lg shadow-rose-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </header>

        {vista === 'metricas' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Total SaaS
                </p>
                <p className="text-5xl font-black italic">{metricas.total}</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">
                  MRR Estimado (Mensual)
                </p>
                <p className="text-5xl font-black italic text-rose-500">
                  ${metricas.mrr.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-400/10 border border-amber-400/20 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">
                  Pagando PRO
                </p>
                <p className="text-5xl font-black italic text-amber-500">
                  {metricas.pro}
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
                  En Trial
                </p>
                <p className="text-5xl font-black italic text-blue-500">
                  {metricas.trial}
                </p>
              </div>
            </div>
          </div>
        )}

        {vista === 'config' && (
          <div className="max-w-2xl bg-white/4 border border-white/10 p-10 rounded-[3.5rem] animate-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black italic uppercase text-rose-500 mb-8">
              Control Global
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                  Precio Básico (ARS/mes)
                </label>
                <input
                  type="number"
                  value={configEdit.precio_basico}
                  onChange={(e) =>
                    setConfigEdit({
                      ...configEdit,
                      precio_basico: Number(e.target.value),
                    })
                  }
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xl font-black outline-none focus:border-rose-500/50 transition-all text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                  Precio PRO (ARS/mes)
                </label>
                <input
                  type="number"
                  value={configEdit.precio_pro}
                  onChange={(e) =>
                    setConfigEdit({
                      ...configEdit,
                      precio_pro: Number(e.target.value),
                    })
                  }
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xl font-black outline-none focus:border-rose-500/50 transition-all text-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
                  Días de Trial para usuarios nuevos
                </label>
                <input
                  type="number"
                  value={configEdit.dias_trial}
                  onChange={(e) =>
                    setConfigEdit({
                      ...configEdit,
                      dias_trial: Number(e.target.value),
                    })
                  }
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xl font-black outline-none focus:border-rose-500/50 transition-all text-blue-400"
                />
              </div>
              <button
                onClick={guardarConfig}
                disabled={guardandoConfig}
                className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-lg text-black bg-rose-500 hover:bg-rose-400 transition-all disabled:opacity-50 mt-4 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
              >
                {guardandoConfig
                  ? 'IMPACTANDO...'
                  : 'GUARDAR PRECIOS EN PRODUCCIÓN'}
              </button>
            </div>
          </div>
        )}

        {vista === 'negocios' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <input
              type="text"
              placeholder="BUSCAR NEGOCIO..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-8 py-6 text-sm font-black uppercase outline-none focus:border-rose-500/30 transition-all"
            />

            <div className="space-y-4">
              {filtrados.map((n) => {
                const enTrial =
                  n.trial_hasta && new Date(n.trial_hasta) > new Date()
                const abierto = negocioDetalle === n.id
                return (
                  <div
                    key={n.id}
                    className="bg-white/4 border border-white/5 rounded-[3rem] overflow-hidden hover:border-white/10 transition-all"
                  >
                    <div
                      className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 cursor-pointer"
                      onClick={() => setNegocioDetalle(abierto ? null : n.id)}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-black italic uppercase">
                            {n.nombre}
                          </h3>
                          {n.suscripcion_tipo === 'pro' ? (
                            <span className="bg-amber-400/20 border border-amber-400/30 text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg">
                              PRO
                            </span>
                          ) : enTrial ? (
                            <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg">
                              TRIAL ({diasTrialRestantes(n.trial_hasta)}D)
                            </span>
                          ) : (
                            <span className="bg-white/10 text-slate-400 text-[9px] font-black uppercase px-2 py-1 rounded-lg">
                              NORMAL
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                          /{n.slug} · Creado:{' '}
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePlan(n.id, n.suscripcion_tipo)
                          }}
                          className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-white/5 hover:bg-amber-400 hover:text-black transition-all"
                        >
                          Cambiar Plan
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open('/reservar/' + n.slug, '_blank')
                          }}
                          className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-white/5 hover:bg-white hover:text-black transition-all"
                        >
                          Ver Web
                        </button>
                      </div>
                    </div>
                    {abierto && (
                      <div className="border-t border-white/5 bg-black/40 p-8 flex justify-between items-center animate-in slide-in-from-top-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
                            God Mode Actions
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                extenderTrial(n.id, configEdit.dias_trial)
                              }
                              className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all"
                            >
                              +{configEdit.dias_trial} Días Trial
                            </button>
                            <button
                              onClick={() => extenderTrial(n.id, 0)}
                              className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
                            >
                              Vencer Trial
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => eliminarNegocio(n.id, n.nombre)}
                          className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase bg-rose-500 text-black hover:bg-rose-400 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                        >
                          FULMINAR NEGOCIO
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
