'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Negocio = {
  id: string; nombre: string; slug: string; owner_id: string
  activo: boolean; suscripcion_tipo: string
  created_at: string; trial_hasta?: string | null
}

type Config = { precio_basico: number; precio_pro: number; dias_trial: number }

type Metrica = {
  totalNegocios: number; activos: number; pro: number; basico: number
  enTrial: number; trialVencido: number; mrr: number
}

const diasTrialRestantes = (trial_hasta?: string | null) => {
  if (!trial_hasta) return 0
  const diff = new Date(trial_hasta).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function SuperAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [config, setConfig] = useState<Config>({ precio_basico: 5000, precio_pro: 25000, dias_trial: 30 })
  const [configEdit, setConfigEdit] = useState<Config>({ precio_basico: 5000, precio_pro: 25000, dias_trial: 30 })
  const [loading, setLoading] = useState(true)
  const [guardandoConfig, setGuardandoConfig] = useState(false)
  const [configGuardada, setConfigGuardada] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'negocios' | 'metricas' | 'config'>('metricas')
  const [negocioDetalle, setNegocioDetalle] = useState<string | null>(null)
  const [pagosNegocio, setPagosNegocio] = useState<{id:string;plan:string;monto:number;estado:string;mp_payment_id?:string;mp_preference_id?:string;fecha_pago?:string;fecha_vencimiento?:string;created_at:string}[]>([])
  const [guardandoTrial, setGuardandoTrial] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const router = useRouter()

  const cargarConfig = useCallback(async () => {
    const { data } = await supabase.from('Config').select('clave, valor')
    if (data) {
      const cfg: Record<string, number> = {}
      data.forEach(r => { cfg[r.clave] = Number(r.valor) })
      const c = {
        precio_basico: cfg.precio_basico ?? 5000,
        precio_pro: cfg.precio_pro ?? 25000,
        dias_trial: cfg.dias_trial ?? 30,
      }
      setConfig(c)
      setConfigEdit(c)
    }
  }, [])

  const cargarNegocios = useCallback(async () => {
    const { data } = await supabase
      .from('Negocio').select('*').order('created_at', { ascending: false })
    setNegocios(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Superadmin User:', user)
      if (!user) { router.push('/dashboard'); return }
      const { data: rol, error } = await supabase.from('AdminRol').select('id').eq('user_id', user.id).single()
      console.log('Superadmin Rol:', rol, 'Error:', error)
      if (!rol) { router.push('/dashboard'); return }
      await Promise.all([cargarNegocios(), cargarConfig()])
      setLoading(false)
    }
    init()
  }, [router, cargarNegocios, cargarConfig])

  const metricas: Metrica = {
    totalNegocios: negocios.length,
    activos: negocios.filter(n => n.activo).length,
    pro: negocios.filter(n => n.suscripcion_tipo === 'pro').length,
    basico: negocios.filter(n => n.suscripcion_tipo === 'basico').length,
    enTrial: negocios.filter(n => n.trial_hasta && new Date(n.trial_hasta) > new Date()).length,
    trialVencido: negocios.filter(n => n.trial_hasta && new Date(n.trial_hasta) < new Date() && n.suscripcion_tipo !== 'pro' && n.suscripcion_tipo !== 'basico').length,
    mrr: negocios.filter(n => n.suscripcion_tipo === 'pro').length * config.precio_pro +
         negocios.filter(n => n.suscripcion_tipo === 'basico').length * config.precio_basico,
  }

  async function guardarConfig() {
    setGuardandoConfig(true)
    const updates = [
      { clave: 'precio_basico', valor: String(configEdit.precio_basico), descripcion: 'Precio plan Basico en ARS' },
      { clave: 'precio_pro', valor: String(configEdit.precio_pro), descripcion: 'Precio plan Pro en ARS' },
      { clave: 'dias_trial', valor: String(configEdit.dias_trial), descripcion: 'Dias de prueba gratuita' },
    ]
    for (const u of updates) {
      await supabase.from('Config').upsert(u, { onConflict: 'clave' })
    }
    await cargarConfig()
    setGuardandoConfig(false)
    setConfigGuardada(true)
    setTimeout(() => setConfigGuardada(false), 2500)
  }

  async function toggleActivo(id: string, actual: boolean) {
    await supabase.from('Negocio').update({ activo: !actual }).eq('id', id)
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, activo: !actual } : n))
  }

  async function togglePlan(id: string, planActual: string) {
    const nuevo = planActual === 'pro' ? 'basico' : 'pro'
    await supabase.from('Negocio').update({ suscripcion_tipo: nuevo }).eq('id', id)
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, suscripcion_tipo: nuevo } : n))
  }

  async function extenderTrial(id: string, dias: number) {
    setGuardandoTrial(id)
    const nuevo = new Date()
    nuevo.setDate(nuevo.getDate() + dias)
    await supabase.from('Negocio').update({ trial_hasta: nuevo.toISOString() }).eq('id', id)
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, trial_hasta: nuevo.toISOString() } : n))
    setGuardandoTrial(null)
  }

  async function verPagos(negocioId: string) {
    const { data } = await supabase
      .from('Suscripcion').select('*').eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
    setPagosNegocio(data ?? [])
    setNegocioDetalle(negocioId)
  }

  async function eliminarNegocio(id: string, nombre: string) {
    if (!confirm('Seguro que queres eliminar "' + nombre + '"?')) return
    await supabase.from('Negocio').delete().eq('id', id)
    setNegocios(prev => prev.filter(n => n.id !== id))
  }

  const negociosFiltrados = negocios.filter(n =>
    n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.slug.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500 font-black italic uppercase animate-pulse">
      Cargando...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">Panel privado</p>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Superadmin</h1>
          </div>
          <div className="flex gap-2">
            {(['metricas', 'negocios', 'config'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={'px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all ' +
                  (vista === v ? 'bg-white text-black border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}>
                {v === 'metricas' ? 'Metricas' : v === 'negocios' ? 'Negocios' : 'Configuracion'}
              </button>
            ))}
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:text-red-400 border border-white/5 transition-colors">
              Salir
            </button>
          </div>
        </header>

        {/* VISTA: MÉTRICAS */}
        {vista === 'metricas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total negocios', value: metricas.totalNegocios, color: 'text-white' },
                { label: 'Activos', value: metricas.activos, color: 'text-emerald-400' },
                { label: 'En trial', value: metricas.enTrial, color: 'text-blue-400' },
                { label: 'Trial vencido', value: metricas.trialVencido, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-5">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">{s.label}</p>
                  <p className={'text-3xl font-black italic ' + s.color}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">MRR estimado</p>
                <p className="text-3xl font-black italic text-emerald-400">
                  ${metricas.mrr.toLocaleString('es-AR')}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">ARS / mes</p>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Plan Pro</p>
                <p className="text-3xl font-black italic text-amber-400">{metricas.pro}</p>
                <p className="text-[10px] text-slate-600 mt-1">${(metricas.pro * config.precio_pro).toLocaleString('es-AR')} /mes</p>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Plan Basico</p>
                <p className="text-3xl font-black italic text-slate-300">{metricas.basico}</p>
                <p className="text-[10px] text-slate-600 mt-1">${(metricas.basico * config.precio_basico).toLocaleString('es-AR')} /mes</p>
              </div>
            </div>

            {/* Conversión trial → pago */}
            <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">Tasa de conversion trial</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: metricas.totalNegocios ? Math.round((metricas.pro + metricas.basico) / metricas.totalNegocios * 100) + '%' : '0%' }} />
                </div>
                <span className="font-black text-emerald-400 text-xl w-16 text-right">
                  {metricas.totalNegocios ? Math.round((metricas.pro + metricas.basico) / metricas.totalNegocios * 100) : 0}%
                </span>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">
                {metricas.pro + metricas.basico} negocios pagan de {metricas.totalNegocios} totales
              </p>
            </div>
          </div>
        )}

        {/* VISTA: NEGOCIOS */}
        {vista === 'negocios' && (
          <div className="space-y-4">
            <input type="text" placeholder="Buscar por nombre o slug..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-white/25 transition-colors" />

            {negociosFiltrados.map(n => {
              const dias = diasTrialRestantes(n.trial_hasta)
              const enTrial = dias > 0 && n.suscripcion_tipo !== 'pro' && n.suscripcion_tipo !== 'basico'
              const abierto = negocioDetalle === n.id

              return (
                <div key={n.id}
                  className={'border rounded-2xl overflow-hidden transition-all ' +
                    (n.activo ? 'bg-white/4 border-white/8' : 'bg-red-500/5 border-red-500/15 opacity-60')}>

                  {/* Fila principal */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black italic uppercase text-lg">{n.nombre}</h3>
                        {n.suscripcion_tipo === 'pro' && (
                          <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">PRO</span>
                        )}
                        {n.suscripcion_tipo === 'basico' && (
                          <span className="bg-white/10 text-white/50 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">BASICO</span>
                        )}
                        {enTrial && (
                          <span className="bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-blue-500/20">
                            TRIAL · {dias}d
                          </span>
                        )}
                        {!n.activo && (
                          <span className="bg-red-500/20 text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/30">INACTIVO</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs font-mono">/{n.slug}</p>
                      <p className="text-slate-600 text-[10px] mt-0.5">
                        {'Creado: ' + new Date(n.created_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => togglePlan(n.id, n.suscripcion_tipo)}
                        className={'px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ' +
                          (n.suscripcion_tipo === 'pro'
                            ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}>
                        {n.suscripcion_tipo === 'pro' ? 'Pro' : 'Normal'}
                      </button>
                      <button onClick={() => toggleActivo(n.id, n.activo)}
                        className={'px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ' +
                          (n.activo
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30')}>
                        {n.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => abierto ? setNegocioDetalle(null) : verPagos(n.id)}
                        className="px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all">
                        {abierto ? 'Cerrar' : 'Detalle'}
                      </button>
                      <button onClick={() => window.open('/reservar/' + n.slug, '_blank')}
                        className="px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all">
                        Ver
                      </button>
                      <button onClick={() => eliminarNegocio(n.id, n.nombre)}
                        className="px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-red-500/5 text-red-500/40 border border-red-500/10 hover:bg-red-500/15 hover:text-red-400 transition-all">
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Panel detalle */}
                  {abierto && (
                    <div className="border-t border-white/8 p-5 bg-black/20 space-y-5">

                      {/* Gestión de trial */}
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">
                          Gestionar trial
                          {n.trial_hasta && (' — vence ' + new Date(n.trial_hasta).toLocaleDateString('es-AR'))}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {[7, 15, 30].map(dias => (
                            <button key={dias}
                              onClick={() => extenderTrial(n.id, dias)}
                              disabled={guardandoTrial === n.id}
                              className="px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all disabled:opacity-50">
                              +{dias} días
                            </button>
                          ))}
                          <button onClick={() => extenderTrial(n.id, 0)}
                            disabled={guardandoTrial === n.id}
                            className="px-3 py-2 rounded-xl text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50">
                            Vencer ahora
                          </button>
                        </div>
                      </div>

                      {/* Historial de pagos */}
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">
                          Historial de pagos ({pagosNegocio.length})
                        </p>
                        {pagosNegocio.length === 0 ? (
                          <p className="text-slate-600 text-xs italic">Sin pagos registrados.</p>
                        ) : (
                          <div className="space-y-2">
                            {pagosNegocio.map(p => (
                              <div key={p.id}
                                className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                                <div>
                                  <p className="text-xs font-black uppercase">
                                    Plan {p.plan}
                                    {p.monto && (' · $' + Number(p.monto).toLocaleString('es-AR'))}
                                  </p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    {p.fecha_pago
                                      ? new Date(p.fecha_pago).toLocaleDateString('es-AR')
                                      : new Date(p.created_at).toLocaleDateString('es-AR')}
                                    {p.fecha_vencimiento && (' → ' + new Date(p.fecha_vencimiento).toLocaleDateString('es-AR'))}
                                  </p>
                                </div>
                                <span className={'text-[9px] font-black uppercase px-2 py-1 rounded-full ' +
                                  (p.estado === 'activa' ? 'bg-emerald-500/20 text-emerald-400' :
                                   p.estado === 'pendiente' ? 'bg-amber-400/20 text-amber-400' :
                                   'bg-red-500/20 text-red-400')}>
                                  {p.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Link WhatsApp del dueño */}
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">Contactar dueño</p>
                        <a href={'https://wa.me/?text=' + encodeURIComponent('Hola! Te escribo de Turnly sobre tu negocio ' + n.nombre + '.')}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase text-black transition-all hover:opacity-90"
                          style={{ backgroundColor: '#25D366' }}>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* VISTA: CONFIGURACIÓN */}
        {vista === 'config' && (
          <div className="max-w-lg space-y-6">
            <div className="bg-white/4 border border-white/8 rounded-[2rem] p-6 space-y-5">
              <h2 className="text-xl font-black italic uppercase text-emerald-500">Precios y configuracion</h2>
              <p className="text-slate-500 text-xs">
                Estos valores se aplican al instante. Los negocios que intenten pagar verán el precio actualizado.
              </p>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                  Precio plan Basico (ARS/mes)
                </label>
                <input type="number" value={configEdit.precio_basico}
                  onChange={e => setConfigEdit(prev => ({ ...prev, precio_basico: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors font-black text-lg"
                  min="0" step="100" />
                <p className="text-[10px] text-slate-600 mt-1">Actual: ${config.precio_basico.toLocaleString('es-AR')}</p>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                  Precio plan Pro (ARS/mes)
                </label>
                <input type="number" value={configEdit.precio_pro}
                  onChange={e => setConfigEdit(prev => ({ ...prev, precio_pro: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors font-black text-lg"
                  min="0" step="100" />
                <p className="text-[10px] text-slate-600 mt-1">Actual: ${config.precio_pro.toLocaleString('es-AR')}</p>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                  Días de trial gratuito
                </label>
                <input type="number" value={configEdit.dias_trial}
                  onChange={e => setConfigEdit(prev => ({ ...prev, dias_trial: Number(e.target.value) }))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors font-black text-lg"
                  min="0" max="365" step="1" />
                <p className="text-[10px] text-slate-600 mt-1">Actual: {config.dias_trial} días</p>
              </div>

              <button onClick={guardarConfig} disabled={guardandoConfig}
                className={'w-full py-4 rounded-2xl font-black italic uppercase text-black transition-all disabled:opacity-50 ' +
                  (configGuardada ? 'bg-emerald-500' : 'bg-white hover:opacity-90')}>
                {guardandoConfig ? 'Guardando...' : configGuardada ? 'Guardado!' : 'Guardar cambios'}
              </button>
            </div>

            <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-3">Precios actuales en produccion</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Plan Basico</span>
                  <span className="font-black text-white">${config.precio_basico.toLocaleString('es-AR')} ARS/mes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Plan Pro</span>
                  <span className="font-black text-amber-400">${config.precio_pro.toLocaleString('es-AR')} ARS/mes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Trial gratuito</span>
                  <span className="font-black text-blue-400">{config.dias_trial} días</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
