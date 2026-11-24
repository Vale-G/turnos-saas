'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getNegocioDelUsuario } from '@/lib/getnegocio'

type StaffItem = { id: string; nombre: string; activo: boolean }


export default function GestionStaff() {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [limite, setLimite] = useState<number | null>(null)
  const colorPrincipal = 'var(--product-accent)'
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const cargarStaff = useCallback(async (nId: string) => {
    const { data } = await supabase
      .from('staff').select('id,nombre,activo').eq('negocio_id', nId).order('created_at', { ascending: false })
    setStaff(data || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { negocio: neg } = await getNegocioDelUsuario(user.id)
      if (!neg) { router.push('/onboarding'); return }

      setNegocioId(neg.id)
      const { data } = await supabase.rpc('turnly_commercial_summary', { business: neg.id })
      setLimite(data?.limits?.staff ?? null)
      await cargarStaff(neg.id)
      setLoading(false)
    }
    init()
  }, [router, cargarStaff])

  const agregarBarbero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocioId) return
    setError(null)

    if (limite !== null && staff.length >= limite) {
      setError('Límite alcanzado. Consultá Mi suscripción.')
      return
    }

    const { error } = await supabase.from('staff').insert([{ nombre, negocio_id: negocioId, activo: true }])
    if (error) { setError(error.message); toast.error(error.message) }
    else { setNombre(''); await cargarStaff(negocioId) }
  }

  const borrarStaff = async (id: string) => {
    if (!negocioId || !confirm('Seguro?')) return
    const { error } = await supabase.from('staff').delete().eq('id', id)
    if (error) { setError(error.message); toast.error(error.message) }
    else await cargarStaff(negocioId)
  }

  const toggleActivo = async (id: string, estadoActual: boolean) => {
    if (!negocioId) return
    const { error } = await supabase.from('staff').update({ activo: !estadoActual }).eq('id', id)
    if (error) { setError(error.message); toast.error(error.message) }
    else await cargarStaff(negocioId)
  }

  if (loading) return (
    <div className="min-h-screen bg-product-bg flex items-center justify-center font-black italic animate-pulse"
      style={{ color: colorPrincipal }}>Cargando...</div>
  )

  const lleno = limite !== null && staff.length >= limite

  return (
    <div className="min-h-screen bg-product-bg text-product-ink p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')}
          className="text-product-muted text-xs font-black uppercase mb-4 hover:text-product-ink transition-colors tracking-widest">
          Volver
        </button>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
            Mi Equipo
          </h1>
          <span className="text-xs font-black text-product-muted">
            {limite === null ? staff.length : staff.length + ' / ' + limite}
          </span>
        </div>

        {lleno ? (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-5 mb-8">
            <p className="font-black text-product-warning text-sm uppercase">Límite del plan vigente</p>
            <p className="text-product-muted text-xs mt-0.5">Consultá Mi suscripción para regularizar el acceso o cambiar de plan.</p>
          </div>
        ) : (
          <form onSubmit={agregarBarbero}
            className="bg-product-subtle border border-product-line p-6 rounded-[2rem] mb-10 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-product-muted ml-2 mb-1 block">
                Nombre del profesional
              </label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: María González"
                className="w-full bg-black border border-product-line p-4 rounded-2xl outline-none text-sm transition-colors"
                required />
            </div>
            <button type="submit"
              className="text-product-button-ink font-black uppercase italic px-8 py-4 rounded-2xl hover:scale-105 transition-transform"
              style={{ backgroundColor: colorPrincipal }}>
              Contratar +
            </button>
          </form>
        )}

        {error && (
          <p className="text-product-danger text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map(persona => (
            <div key={persona.id}
              className="bg-product-subtle border border-product-line p-6 rounded-[2rem] flex justify-between items-center group hover:bg-product-subtle hover:border-product-line transition-all">
              <div>
                <h3 className={'font-black uppercase italic text-xl tracking-tight ' + (!persona.activo && 'text-product-muted line-through')}>
                  {persona.nombre}
                </h3>
                <p className={'text-[10px] font-bold uppercase tracking-widest mt-1 ' + (persona.activo ? 'text-emerald-500' : 'text-product-danger')}>
                  {persona.activo ? 'Disponible' : 'No disponible'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActivo(persona.id, persona.activo)}
                  className="p-2 bg-product-subtle hover:bg-product-subtle rounded-xl text-[10px] font-black uppercase transition-colors">
                  {persona.activo ? 'Pausar' : 'Activar'}
                </button>
                <button onClick={() => borrarStaff(persona.id)}
                  className="p-2 hover:text-product-danger text-product-muted transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
