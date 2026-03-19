'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Negocio = {
  id: string
  nombre: string
  slug: string
  owner_id: string
  activo: boolean
  suscripcion_tipo: string
  created_at: string
}

const ADMIN_EMAIL = 'valepro50020@gmail.com'

export default function SuperAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function verificarAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Doble verificación: email + rol en DB
      if (user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }

      const { data: rol } = await supabase
        .from('AdminRol')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!rol) { router.push('/dashboard'); return }

      await cargarNegocios()
    }
    verificarAdmin()
  }, [])

  async function cargarNegocios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('Negocio')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); setLoading(false); return }
    setNegocios(data ?? [])
    setLoading(false)
  }

  async function toggleActivo(id: string, estadoActual: boolean) {
    const { error } = await supabase
      .from('Negocio')
      .update({ activo: !estadoActual })
      .eq('id', id)

    if (error) { alert(error.message); return }
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, activo: !estadoActual } : n))
  }

  async function togglePlan(id: string, planActual: string) {
    const nuevoPlan = planActual === 'pro' ? 'normal' : 'pro'
    const { error } = await supabase
      .from('Negocio')
      .update({ suscripcion_tipo: nuevoPlan })
      .eq('id', id)

    if (error) { alert(error.message); return }
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, suscripcion_tipo: nuevoPlan } : n))
  }

  async function eliminarNegocio(id: string, nombre: string) {
    if (!confirm(`¿Seguro que querés eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('Negocio').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setNegocios(prev => prev.filter(n => n.id !== id))
  }

  const negociosFiltrados = negocios.filter(n =>
    n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    n.slug.toLowerCase().includes(busqueda.toLowerCase())
  )

  const stats = {
    total: negocios.length,
    activos: negocios.filter(n => n.activo).length,
    pro: negocios.filter(n => n.suscripcion_tipo === 'pro').length,
    inactivos: negocios.filter(n => !n.activo).length,
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <p className="text-emerald-500 font-black italic uppercase animate-pulse">Cargando panel...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <p className="text-red-400 font-bold">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="flex items-end justify-between mb-10 border-b border-white/5 pb-8">
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Panel Privado</p>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">Superadmin</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-slate-600 hover:text-red-400 text-xs font-black uppercase transition-colors"
          >
            Salir
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Activos', value: stats.activos, color: 'text-emerald-500' },
            { label: 'Plan Pro', value: stats.pro, color: 'text-amber-400' },
            { label: 'Inactivos', value: stats.inactivos, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">{s.label}</p>
              <p className={`text-4xl font-black italic ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Tabla de negocios */}
        <div className="space-y-3">
          {negociosFiltrados.length === 0 ? (
            <p className="text-slate-500 text-center py-16 font-bold italic">No hay negocios.</p>
          ) : negociosFiltrados.map(n => (
            <div
              key={n.id}
              className={`border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                n.activo ? 'bg-white/4 border-white/8' : 'bg-red-500/5 border-red-500/15 opacity-60'
              }`}
            >
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-black italic uppercase text-lg">{n.nombre}</h3>
                  {n.suscripcion_tipo === 'pro' && (
                    <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">PRO</span>
                  )}
                  {!n.activo && (
                    <span className="bg-red-500/20 text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/30">INACTIVO</span>
                  )}
                </div>
                <p className="text-slate-500 text-xs font-mono">/{n.slug}</p>
                <p className="text-slate-600 text-[10px] mt-1">
                  Creado: {new Date(n.created_at).toLocaleDateString('es-AR')}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 flex-wrap">
                {/* Toggle Plan */}
                <button
                  onClick={() => togglePlan(n.id, n.suscripcion_tipo)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    n.suscripcion_tipo === 'pro'
                      ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 border border-amber-400/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {n.suscripcion_tipo === 'pro' ? '★ Pro' : '☆ Normal'}
                </button>

                {/* Toggle Activo */}
                <button
                  onClick={() => toggleActivo(n.id, n.activo)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${
                    n.activo
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 border-emerald-500/30 hover:border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30'
                  }`}
                >
                  {n.activo ? 'Desactivar' : 'Activar'}
                </button>

                {/* Ver reservas */}
                
                  href={`/reservar/${n.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 transition-all"
                >
                  Ver →
                </a>

                {/* Eliminar */}
                <button
                  onClick={() => eliminarNegocio(n.id, n.nombre)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-red-500/5 text-red-500/50 hover:bg-red-500/15 hover:text-red-400 border border-red-500/10 hover:border-red-500/30 transition-all"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
