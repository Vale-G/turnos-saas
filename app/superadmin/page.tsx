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
const TEMAS = ['emerald', 'rose', 'blue', 'amber', 'violet', 'cyan']

export default function SuperAdmin() {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<'lista' | 'crear'>('lista')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Form nuevo negocio
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoSlug, setNuevoSlug] = useState('')
  const [nuevoTema, setNuevoTema] = useState('emerald')
  const [nuevoPlan, setNuevoPlan] = useState('normal')

  const router = useRouter()

  useEffect(() => {
    async function verificarAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (user.email !== ADMIN_EMAIL) { router.push('/dashboard'); return }
      const { data: rol } = await supabase.from('AdminRol').select('id').eq('user_id', user.id).single()
      if (!rol) { router.push('/dashboard'); return }
      await cargarNegocios()
    }
    verificarAdmin()
  }, [])

  async function cargarNegocios() {
    setLoading(true)
    const { data } = await supabase.from('Negocio').select('*').order('created_at', { ascending: false })
    setNegocios(data ?? [])
    setLoading(false)
  }

  async function crearNegocio(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setExito(null)

    const slugFinal = nuevoSlug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Verificar slug unico
    const { data: slugExiste } = await supabase.from('Negocio').select('id').eq('slug', slugFinal).single()
    if (slugExiste) { setError('Ese slug ya existe.'); setGuardando(false); return }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: nuevoEmail,
      password: nuevoPassword,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Error creando usuario')
      setGuardando(false)
      return
    }

    // Crear negocio
    const { error: dbError } = await supabase.from('Negocio').insert({
      owner_id: authData.user.id,
      nombre: nuevoNombre,
      slug: slugFinal,
      tema: nuevoTema,
      suscripcion_tipo: nuevoPlan,
      activo: true,
    })

    if (dbError) { setError(dbError.message); setGuardando(false); return }

    setExito('Negocio creado. Email de confirmacion enviado a ' + nuevoEmail)
    setNuevoEmail(''); setNuevoPassword(''); setNuevoNombre(''); setNuevoSlug('')
    setNuevoTema('emerald'); setNuevoPlan('normal')
    await cargarNegocios()
    setGuardando(false)
  }

  async function toggleActivo(id: string, estadoActual: boolean) {
    const { error } = await supabase.from('Negocio').update({ activo: !estadoActual }).eq('id', id)
    if (error) { alert(error.message); return }
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, activo: !estadoActual } : n))
  }

  async function togglePlan(id: string, planActual: string) {
    const nuevoPlan = planActual === 'pro' ? 'normal' : 'pro'
    const { error } = await supabase.from('Negocio').update({ suscripcion_tipo: nuevoPlan }).eq('id', id)
    if (error) { alert(error.message); return }
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, suscripcion_tipo: nuevoPlan } : n))
  }

  async function eliminarNegocio(id: string, nombre: string) {
    if (!confirm('Seguro que queres eliminar "' + nombre + '"? No se puede deshacer.')) return
    const { error } = await supabase.from('Negocio').delete().eq('id', id)
    if (error) { alert(error.message); return }
    setNegocios(prev => prev.filter(n => n.id !== id))
  }

  const handleNombreChange = (valor: string) => {
    setNuevoNombre(valor)
    setNuevoSlug(
      valor.toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-').replace(/-+/g, '-')
    )
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
      <p className="text-emerald-500 font-black italic uppercase animate-pulse">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <div>
            <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest mb-1">Panel Privado</p>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Superadmin</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setVista(vista === 'lista' ? 'crear' : 'lista')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${
                vista === 'crear'
                  ? 'bg-emerald-500 text-black border-transparent'
                  : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              {vista === 'crear' ? 'Ver lista' : '+ Nuevo negocio'}
            </button>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase text-slate-600 hover:text-red-400 border border-white/5 transition-colors"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Activos', value: stats.activos, color: 'text-emerald-500' },
            { label: 'Pro', value: stats.pro, color: 'text-amber-400' },
            { label: 'Inactivos', value: stats.inactivos, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/4 border border-white/8 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">{s.label}</p>
              <p className={'text-3xl font-black italic ' + s.color}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* FORM CREAR NEGOCIO */}
        {vista === 'crear' && (
          <form onSubmit={crearNegocio}
            className="bg-white/4 border border-white/8 rounded-[2rem] p-6 mb-8 space-y-4">
            <h2 className="text-xl font-black italic uppercase text-emerald-500 mb-2">Nuevo Negocio</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Nombre del negocio</label>
                <input type="text" value={nuevoNombre} onChange={e => handleNombreChange(e.target.value)}
                  placeholder="Ej: Turnly Shop"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                  required />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Slug (URL)</label>
                <input type="text" value={nuevoSlug} onChange={e => setNuevoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="turnly-shop"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-colors"
                  required />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Email del dueño</label>
                <input type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)}
                  placeholder="dueno@email.com"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                  required />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Contraseña inicial</label>
                <input type="text" value={nuevoPassword} onChange={e => setNuevoPassword(e.target.value)}
                  placeholder="Minimo 8 caracteres"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors"
                  minLength={8} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Tema</label>
                <div className="flex gap-2 flex-wrap">
                  {TEMAS.map(t => (
                    <button key={t} type="button" onClick={() => setNuevoTema(t)}
                      className={'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ' +
                        (nuevoTema === t ? 'bg-white/20 border-white' : 'bg-white/5 border-white/10 text-slate-400')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Plan</label>
                <div className="flex gap-2">
                  {['normal', 'pro'].map(p => (
                    <button key={p} type="button" onClick={() => setNuevoPlan(p)}
                      className={'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ' +
                        (nuevoPlan === p
                          ? p === 'pro' ? 'bg-amber-400 text-black border-transparent' : 'bg-white text-black border-transparent'
                          : 'bg-white/5 border-white/10 text-slate-400')}>
                      {p === 'pro' ? 'Pro' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            {exito && <p className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">{exito}</p>}

            <button type="submit" disabled={guardando}
              className="w-full py-4 rounded-2xl font-black italic uppercase text-black bg-emerald-500 hover:opacity-90 transition-opacity disabled:opacity-50">
              {guardando ? 'Creando...' : 'Crear negocio'}
            </button>
          </form>
        )}

        {/* LISTA */}
        {vista === 'lista' && (
          <>
            <input type="text" placeholder="Buscar por nombre o slug..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-emerald-500 transition-colors mb-4" />

            <div className="space-y-3">
              {negociosFiltrados.length === 0 ? (
                <p className="text-slate-500 text-center py-16 font-bold italic">No hay negocios.</p>
              ) : negociosFiltrados.map(n => (
                <div key={n.id}
                  className={'border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ' +
                    (n.activo ? 'bg-white/4 border-white/8' : 'bg-red-500/5 border-red-500/15 opacity-60')}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      {'Creado: ' + new Date(n.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => togglePlan(n.id, n.suscripcion_tipo)}
                      className={'px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ' +
                        (n.suscripcion_tipo === 'pro'
                          ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10')}>
                      {n.suscripcion_tipo === 'pro' ? 'Plan Pro' : 'Plan Normal'}
                    </button>

                    <button onClick={() => toggleActivo(n.id, n.activo)}
                      className={'px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ' +
                        (n.activo
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20')}>
                      {n.activo ? 'Desactivar' : 'Activar'}
                    </button>

                    <button onClick={() => window.open('/reservar/' + n.slug, '_blank')}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all">
                      Ver
                    </button>

                    <button onClick={() => eliminarNegocio(n.id, n.nombre)}
                      className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-500/5 text-red-500/50 border border-red-500/10 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 transition-all">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
