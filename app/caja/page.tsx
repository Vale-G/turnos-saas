'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'

function toBaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date)
}

export default function CajaElite() {
  const [negocio, setNegocio] = useState<any>(null)
  const [ingresos, setIngresos] = useState<any[]>([])
  const [gastos, setGastos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()

  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(toBaDateStr(new Date()))
  const [mesFiltro, setMesFiltro] = useState(toBaDateStr(new Date()).slice(0, 7))

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: neg } = await supabase.from('negocio').select('id, tema, suscripcion_tipo').eq('owner_id', user.id).single()
      if (!neg) return router.push('/onboarding')
      if (neg.suscripcion_tipo !== 'pro' && neg.suscripcion_tipo !== 'trial') {
        toast.error('La gestión de Caja es exclusiva del plan PRO')
        return router.push('/dashboard')
      }
      setNegocio(neg)
    }
    init()
  }, [router])

  const cargarDatos = async () => {
    if (!negocio?.id) return
    setLoading(true)
    const startOfMonth = `${mesFiltro}-01`
    const endOfMonth = `${mesFiltro}-31`

    const [{ data: turnos }, { data: gst }] = await Promise.all([
      supabase.from('turno').select('fecha, servicio(precio)').eq('negocio_id', negocio.id).eq('pago_estado', 'cobrado').gte('fecha', startOfMonth).lte('fecha', endOfMonth),
      supabase.from('gasto').select('*').eq('negocio_id', negocio.id).gte('fecha', startOfMonth).lte('fecha', endOfMonth).order('fecha', { ascending: false })
    ])
    setIngresos(turnos || [])
    setGastos(gst || [])
    setLoading(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [negocio, mesFiltro])

  const agregarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('gasto').insert({ negocio_id: negocio.id, concepto, monto: Number(monto), fecha: fechaGasto })
    setGuardando(false)
    if (error) return toast.error('Error al registrar el gasto')
    toast.success('Gasto registrado con éxito')
    setConcepto(''); setMonto('')
    cargarDatos()
  }

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gasto').delete().eq('id', id)
    setGastos(gastos.filter(g => g.id !== id))
    toast.success('Gasto eliminado')
  }

  const colorP = getThemeColor(negocio?.tema)

  const totalIngresos = useMemo(() => ingresos.reduce((acc, t) => acc + (t.servicio?.precio || 0), 0), [ingresos])
  const totalGastos = useMemo(() => gastos.reduce((acc, g) => acc + Number(g.monto), 0), [gastos])
  const gananciaNeta = totalIngresos - totalGastos

  if (loading && !negocio) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black italic text-white text-3xl animate-pulse tracking-tighter">CALCULANDO FINANZAS...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors">← Dashboard</button>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Caja <span style={{ color: colorP }}>PRO</span></h1>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className="bg-transparent font-black text-sm outline-none text-white uppercase tracking-widest [&::-webkit-calendar-picker-indicator]:invert cursor-pointer" />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Ingresos Cobrados</p>
            <p className="text-4xl font-black italic text-emerald-400">${totalIngresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Total Gastos</p>
            <p className="text-4xl font-black italic text-rose-400">-${totalGastos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20" style={{ backgroundColor: gananciaNeta >= 0 ? colorP : '#f43f5e' }} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Ganancia Neta</p>
            <p className="text-5xl font-black italic" style={{ color: gananciaNeta >= 0 ? colorP : '#f43f5e' }}>
              ${gananciaNeta.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={agregarGasto} className="bg-white/4 border border-white/5 p-10 rounded-[3.5rem] h-fit shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Registrar Nuevo Gasto</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Fecha</label>
                <input type="date" value={fechaGasto} onChange={e => setFechaGasto(e.target.value)} required className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all [&::-webkit-calendar-picker-indicator]:invert" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Concepto (Insumos, Alquiler)</label>
                <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)} required placeholder="EJ: PAGO DE LUZ" className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Monto ($)</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} required placeholder="5000" className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30 transition-all placeholder:text-slate-800" />
              </div>
              <button type="submit" disabled={guardando} className="w-full mt-4 py-6 rounded-[2.5rem] font-black uppercase italic text-lg text-black transition-all hover:scale-105 active:scale-95 shadow-xl" style={{ backgroundColor: colorP }}>
                {guardando ? 'REGISTRANDO...' : 'REGISTRAR GASTO'}
              </button>
            </div>
          </form>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 px-4">Historial de Gastos</p>
            {loading ? (
               <div className="text-center py-10 font-black italic text-slate-800 animate-pulse text-xl uppercase tracking-tighter">CARGANDO...</div>
            ) : gastos.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem]">
                <p className="text-slate-600 font-black uppercase tracking-widest text-xs">Sin gastos en este mes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gastos.map(g => (
                  <div key={g.id} className="bg-white/4 border border-white/5 p-6 rounded-[2.5rem] flex justify-between items-center group hover:bg-white/10 transition-all">
                    <div>
                      <p className="text-lg font-black uppercase italic text-white/90">{g.concepto}</p>
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">{g.fecha}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-2xl font-black italic text-rose-400">-${Number(g.monto).toLocaleString('es-AR')}</p>
                      <button onClick={() => eliminarGasto(g.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 font-black text-[9px] uppercase tracking-widest transition-all bg-rose-500/10 px-3 py-1.5 mt-1 rounded-xl hover:bg-rose-500/20">Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
