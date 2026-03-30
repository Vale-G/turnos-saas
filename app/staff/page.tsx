'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type StaffItem = { id: string; nombre: string; activo: boolean }
const MAX_STAFF: Record<string, number> = { normal: 2, basico: 2, pro: 999, trial: 999 }

export default function GestionStaff() {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('normal')
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const cargarStaff = useCallback(async (nId: string) => {
    const { data } = await supabase
      .from('staff').select('*').eq('negocio_id', nId).order('created_at', { ascending: false })
    setStaff(data || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let neg = null
      const { data: byOwner } = await supabase.from('negocio').select('id, tema, suscripcion_tipo').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else {
        const { data: byId } = await supabase.from('negocio').select('id, tema, suscripcion_tipo').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single()
        neg = byId
      }
      if (!neg) { router.push('/onboarding'); return }

      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
      setPlan(neg.suscripcion_tipo ?? 'normal')
      await cargarStaff(neg.id)
      setLoading(false)
    }
    init()
  }, [router, cargarStaff])

  const agregarBarbero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocioId) return
    setError(null)

    if (staff.length >= MAX_STAFF[plan]) {
      setError(plan === 'normal'
        ? 'Límite del plan Normal (2 barberos). Upgradea a Pro para agregar más.'
        : 'Límite alcanzado.')
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
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic animate-pulse"
      style={{ color: colorPrincipal }}>Cargando...</div>
  )

  const limite = MAX_STAFF[plan]
  const lleno = staff.length >= limite

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')}
          className="text-slate-500 text-xs font-black uppercase mb-4 hover:text-white transition-colors tracking-widest">
          Volver
        </button>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
            Mi Equipo
          </h1>
          <span className="text-xs font-black text-slate-500">
            {plan === 'pro' ? staff.length + ' barberos' : staff.length + ' / ' + limite}
          </span>
          {plan === 'pro' && (
            <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">PRO</span>
          )}
        </div>

        {lleno && plan === 'normal' ? (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-5 mb-8">
            <p className="font-black text-amber-400 text-sm uppercase">Límite del plan Normal</p>
            <p className="text-slate-400 text-xs mt-0.5">Tenés {limite} barberos. Upgrade a Pro para agregar más.</p>
          </div>
        ) : (
          <form onSubmit={agregarBarbero}
            className="bg-white/4 border border-white/8 p-6 rounded-[2rem] mb-10 flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">
                Nombre del Barbero / Estilista
              </label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Franco el barbero"
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none text-sm transition-colors"
                required />
            </div>
            <button type="submit"
              className="text-black font-black uppercase italic px-8 py-4 rounded-2xl hover:scale-105 transition-transform"
              style={{ backgroundColor: colorPrincipal }}>
              Contratar +
            </button>
          </form>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map(persona => (
            <div key={persona.id}
              className="bg-white/4 border border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:bg-white/6 hover:border-white/10 transition-all">
              <div>
                <h3 className={'font-black uppercase italic text-xl tracking-tight ' + (!persona.activo && 'text-slate-600 line-through')}>
                  {persona.nombre}
                </h3>
                <p className={'text-[10px] font-bold uppercase tracking-widest mt-1 ' + (persona.activo ? 'text-emerald-500' : 'text-red-400')}>
                  {persona.activo ? 'Disponible' : 'No disponible'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActivo(persona.id, persona.activo)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase transition-colors">
                  {persona.activo ? 'Pausar' : 'Activar'}
                </button>
                <button onClick={() => borrarStaff(persona.id)}
                  className="p-2 hover:text-red-400 text-slate-600 transition-colors">
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
