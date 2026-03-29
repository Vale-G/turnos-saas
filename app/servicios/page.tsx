'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getNegocioDelUsuario } from '@/lib/getnegocio'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'

type ServicioItem = { id: string; nombre: string; precio: number; duracion: number }
const MAX_SERVICIOS: Record<string, number> = { normal: 5, basico: 5, pro: 999, trial: 999 }

export default function GestionServicios() {
  const [servicios, setServicios] = useState<ServicioItem[]>([])
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('normal')
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('')
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const cargarServicios = useCallback(async (nId: string) => {
    const { data } = await supabase
      .from('Servicio').select('*').eq('negocio_id', nId).order('created_at', { ascending: false })
    setServicios(data || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const neg = await getNegocioDelUsuario(user.id)
      if (!neg) { router.push('/dashboard'); return }

      setNegocioId(neg.id)
      setColorPrincipal(getThemeColor(neg.tema))
      setPlan(neg.suscripcion_tipo ?? 'normal')
      await cargarServicios(neg.id)
      setLoading(false)
    }
    init()
  }, [router, cargarServicios])

  const agregarServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocioId) return
    setError(null)

    // FIX: chequear límite según plan real
    if (servicios.length >= MAX_SERVICIOS[plan]) {
      setError(plan === 'normal'
        ? 'Límite del plan Normal (5 servicios). Upgradea a Pro para agregar más.'
        : 'Límite alcanzado.')
      return
    }

    if (parseFloat(precio) <= 0 || isNaN(parseFloat(precio))) {
      setError('El precio debe ser mayor a 0'); return;
    }
    if (parseInt(duracion) < 15 || isNaN(parseInt(duracion))) {
      setError('La duración mínima es 15 minutos'); return;
    }
    const { error } = await supabase.from('Servicio').insert([
      { nombre: nombre.trim(), precio: parseFloat(precio), duracion: parseInt(duracion), negocio_id: negocioId },
    ])
    if (error) setError(error.message)
    else { setNombre(''); setPrecio(''); setDuracion(''); await cargarServicios(negocioId) }
  }

  const borrarServicio = async (id: string) => {
    if (!negocioId || !confirm('Seguro?')) return
    const { error } = await supabase.from('Servicio').delete().eq('id', id)
    if (error) setError(error.message)
    else await cargarServicios(negocioId)
  }

  const guardarEdicion = async (id: string, n: string, p: string, d: string) => {
    if (!negocioId) return
    const { error } = await supabase.from('Servicio')
      .update({ nombre: n, precio: parseFloat(p), duracion: parseInt(d) }).eq('id', id)
    if (error) setError(error.message)
    else { setEditandoId(null); await cargarServicios(negocioId) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic animate-pulse"
      style={{ color: colorPrincipal }}>Cargando...</div>
  )

  const limite = MAX_SERVICIOS[plan]
  const lleno = servicios.length >= limite

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')}
          className="text-slate-500 text-xs font-black uppercase mb-4 hover:text-white transition-colors tracking-widest">
          Volver
        </button>

        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>
            Servicios
          </h1>
          <span className="text-xs font-black text-slate-500">
            {plan === 'pro' ? servicios.length + ' servicios' : servicios.length + ' / ' + limite}
          </span>
          {plan === 'pro' && (
            <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">PRO</span>
          )}
        </div>

        {/* Formulario */}
        {lleno && plan === 'normal' ? (
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-amber-400 text-sm uppercase">Límite del plan Normal</p>
              <p className="text-slate-400 text-xs mt-0.5">Tenés {limite} servicios. Upgrade a Pro para agregar más.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={agregarServicio}
            className="bg-white/4 border border-white/8 p-6 rounded-[2rem] mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none text-sm transition-colors"
                style={{ '--tw-ring-color': colorPrincipal } as React.CSSProperties} required />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Precio $</label>
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} min="0" step="0.01"
                className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none text-sm" required />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-1 block">Minutos</label>
              <input type="number" value={duracion} onChange={e => setDuracion(e.target.value)} min="15" step="15"
                className="w-full bg-black border border-white/10 p-3 rounded-xl outline-none text-sm" required />
            </div>
            <button type="submit"
              className="text-black font-black uppercase italic p-3 rounded-xl hover:scale-105 transition-transform"
              style={{ backgroundColor: colorPrincipal }}>
              Agregar +
            </button>
          </form>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        <div className="space-y-3">
          {servicios.map(s => (
            <div key={s.id}
              className="bg-white/4 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/6 hover:border-white/10 transition-all">
              {editandoId === s.id ? (
                <div className="flex flex-1 gap-2 items-center flex-wrap">
                  <input id={'n-' + s.id} defaultValue={s.nombre}
                    className="bg-black border border-white/20 p-2 rounded-lg text-sm flex-1 min-w-[120px] outline-none" />
                  <input id={'p-' + s.id} defaultValue={s.precio} type="number"
                    className="bg-black border border-white/20 p-2 rounded-lg text-sm w-20 outline-none" />
                  <input id={'d-' + s.id} defaultValue={s.duracion} type="number"
                    className="bg-black border border-white/20 p-2 rounded-lg text-sm w-20 outline-none" />
                  <button onClick={() => {
                    const n = (document.getElementById('n-' + s.id) as HTMLInputElement).value
                    const p = (document.getElementById('p-' + s.id) as HTMLInputElement).value
                    const d = (document.getElementById('d-' + s.id) as HTMLInputElement).value
                    guardarEdicion(s.id, n, p, d)
                  }} className="font-black text-xs uppercase px-3 py-2 rounded-lg transition-colors"
                    style={{ color: colorPrincipal }}>
                    Listo
                  </button>
                  <button onClick={() => setEditandoId(null)}
                    className="text-slate-500 font-black text-xs uppercase px-3 py-2 rounded-lg hover:text-white transition-colors">
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-black uppercase italic text-lg tracking-tight">{s.nombre}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{s.duracion} MIN</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-2xl font-black italic" style={{ color: colorPrincipal }}>${s.precio}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditandoId(s.id)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white text-xs font-bold uppercase">
                        Editar
                      </button>
                      <button onClick={() => borrarServicio(s.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 text-xs font-bold uppercase">
                        Borrar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
