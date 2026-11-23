'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const BA_TZ = 'America/Argentina/Buenos_Aires'
function toBaDateStr(date: Date): string { return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date) }

function getMonthRange(monthIso: string) {
  const [y, m] = monthIso.split('-').map(Number)
  const start = `${monthIso}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, next }
}

type NegocioCaja = { id: string; tema: string | null; suscripcion_tipo: string }
type Ingreso = { fecha:string; precio_acordado:number|null; sena_pagada:boolean; monto_sena:number|null; saldo_mp:number|null; estado: string; pago_estado: string | null; servicio: { precio: number } | Array<{ precio: number }> | null }
type Gasto = { id: string; concepto: string; monto: number | string; fecha: string }

async function fetchCaja(negocioId: string, month: string) {
  const { start, next } = getMonthRange(month)
  const [turnos, gastos] = await Promise.all([
    supabase.from('turno').select('fecha, estado, pago_estado,precio_acordado,sena_pagada,monto_sena,saldo_mp, servicio(precio)', { count: 'exact' }).eq('negocio_id', negocioId).gte('fecha', start).lt('fecha', next),
    supabase.from('gasto').select('id,concepto,monto,fecha', { count: 'exact' }).eq('negocio_id', negocioId).gte('fecha', start).lt('fecha', next).order('fecha', { ascending: false }),
  ])
  if (turnos.error || gastos.error || turnos.data?.length !== turnos.count || gastos.data?.length !== gastos.count) return null
  return { ingresos: turnos.data as Ingreso[], gastos: gastos.data as Gasto[] }
}

export default function CajaElite() {
  const [negocio, setNegocio] = useState<NegocioCaja | null>(null)
  const [periodo, setPeriodo] = useState<{ mes: string; revision: number; data: Awaited<ReturnType<typeof fetchCaja>> }>()
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [tieneAcceso, setTieneAcceso] = useState(false)
  const router = useRouter()

  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaGasto, setFechaGasto] = useState(toBaDateStr(new Date()))
  const [diaFiltro, setDiaFiltro] = useState('')
  const [mesFiltro, setMesFiltro] = useState(toBaDateStr(new Date()).slice(0, 7))

  const periodoActual = periodo?.mes === mesFiltro && periodo.revision === revision ? periodo : undefined
  const ingresosVisibles = useMemo(() => (periodoActual?.data?.ingresos ?? []).filter(ingreso => !diaFiltro || ingreso.fecha === diaFiltro), [diaFiltro, periodoActual])
  const gastosVisibles = useMemo(() => (periodoActual?.data?.gastos ?? []).filter(gasto => !diaFiltro || gasto.fecha === diaFiltro), [diaFiltro, periodoActual])

  // REGLA DE REACT: Todos los Hooks van ARRIBA de los 'if'
  const colorP = 'var(--product-accent)'
  const caja = useMemo(()=> ingresosVisibles.reduce((totals,t)=>{
    const svc=Array.isArray(t.servicio)?t.servicio[0]:t.servicio
    const price=Number(t.precio_acordado ?? svc?.precio ?? 0)
    const deposit=t.sena_pagada?Number(t.monto_sena ?? 0):0
    const balance=t.saldo_mp ?? (t.pago_estado==='cobrado' || (t.precio_acordado===null && t.pago_estado==='approved' && !t.sena_pagada) ? Math.max(0,price-deposit):0)
    if(t.estado!=='cancelado' && t.precio_acordado!=null) totals.agreed+=Number(t.precio_acordado)
    totals.deposits+=deposit
    totals.balances+=Number(balance)
    return totals
  },{agreed:0,deposits:0,balances:0}),[ingresosVisibles])
  const totalIngresos=caja.deposits+caja.balances
  const totalGastos = useMemo(() => gastosVisibles.reduce((acc, g) => acc + Number(g.monto), 0), [gastosVisibles])
  const gananciaNeta = totalIngresos - totalGastos

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: adm } = await supabase.from('adminrol').select('negocio_id,role').eq('user_id', user.id).maybeSingle()
      let negId = adm?.negocio_id
      if (!negId) {
         const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
         if (n) negId = n.id
      }

      if (negId) {
        const { data: neg } = await supabase.from('negocio').select('id,tema,suscripcion_tipo').eq('id', negId).single()
        if (neg) {
          setNegocio(neg)
          const { data } = await supabase.rpc('turnly_commercial_summary', { business: neg.id })
          setTieneAcceso(data?.limits?.advanced === true)
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id || !tieneAcceso) return
    let active = true
    void fetchCaja(negocio.id, mesFiltro).catch(() => null).then((data) => {
      if (active) setPeriodo({ mes: mesFiltro, revision, data })
    })
    return () => { active = false }
  }, [negocio?.id, mesFiltro, revision, tieneAcceso])

  useEffect(() => {
    if (!negocio?.id || !tieneAcceso) return
    const channel = supabase
      .channel(`caja-turnos-${negocio.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turno', filter: `negocio_id=eq.${negocio.id}` }, () => {
        setRevision(value => value + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [negocio?.id, tieneAcceso])

  const agregarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocio) return toast.error('No se encontró el negocio')
    const negocioId = negocio.id
    setGuardando(true)
    const { error } = await supabase.from('gasto').insert({ negocio_id: negocioId, concepto, monto: Number(monto), fecha: fechaGasto })
    setGuardando(false)
    if (error) return toast.error('Error al registrar el gasto')
    toast.success('Gasto registrado con éxito')
    setConcepto(''); setMonto('')
    setRevision(value => value + 1)
  }

  const eliminarGasto = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('gasto').delete().eq('id', id)
    if (error) return toast.error('No se pudo eliminar el gasto')
    setRevision(value => value + 1)
    toast.success('Gasto eliminado')
  }

  // AHORA SÍ: Los early returns van después de los Hooks
  if (loading) return <div className="min-h-screen bg-product-bg flex items-center justify-center font-black italic text-product-ink text-3xl animate-pulse tracking-tighter">CALCULANDO FINANZAS...</div>

  if (!tieneAcceso) return (
    <div className="min-h-screen bg-product-bg text-product-ink p-6 md:p-12 flex items-center justify-center relative overflow-hidden">
       <button onClick={() => router.push('/dashboard')} className="absolute top-12 left-12 text-product-muted text-[10px] font-black uppercase tracking-[0.4em] hover:text-product-ink transition-colors z-20">← Volver al Dashboard</button>
       <div className="relative z-10 max-w-lg w-full bg-product-subtle border border-product-line p-12 rounded-[3.5rem] text-center backdrop-blur-xl shadow-2xl">
          <div className="w-24 h-24 bg-amber-400/10 border border-amber-400/30 text-product-warning rounded-full flex items-center justify-center text-5xl mx-auto mb-8">💰</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl mb-4 text-product-ink">Función <span className="text-product-warning">PRO</span></h1>
          <p className="text-product-muted text-sm font-medium mb-8">La Caja y Ganancia Neta es exclusiva del plan PRO Elite.</p>
       </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-product-bg text-product-ink p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-product-muted text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-product-ink transition-colors">← Dashboard</button>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Caja <span style={{ color: colorP }}>PRO</span></h1>
          </div>
          <div className="bg-product-subtle border border-product-line px-4 py-2 rounded-2xl backdrop-blur-md">
            <input type="month" aria-label="Mes de caja" value={mesFiltro} onChange={e => { if (e.target.value) { setMesFiltro(e.target.value); setDiaFiltro('') } }} className="bg-transparent font-black text-sm outline-none text-product-ink uppercase tracking-widest  cursor-pointer" />
          </div>
        </header>

        <label className="mb-4 flex flex-wrap items-center gap-3">
          Día del mes
          <select className="product-field min-h-11" value={diaFiltro} onChange={e => setDiaFiltro(e.target.value)}>
            <option value="">Mes completo</option>
            {Array.from({ length: new Date(Date.UTC(Number(mesFiltro.slice(0, 4)), Number(mesFiltro.slice(5, 7)), 0)).getUTCDate() }, (_, index) => {
              const day = String(index + 1).padStart(2, '0')
              return <option key={day} value={mesFiltro + '-' + day}>{day}</option>
            })}
          </select>
        </label>
        {!periodoActual && <p role="status">Cargando movimientos…</p>}
        {periodoActual && !periodoActual.data && (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            No se pudo consultar el período completo.
            <button className="product-action" type="button" onClick={() => setRevision(value => value + 1)}>Reintentar</button>
          </div>
        )}
        {periodoActual?.data && <>
        <p className="mb-5">{diaFiltro ? 'Turnos del ' + diaFiltro : 'Turnos del mes'} · Importe pactado registrado en reservas vigentes: ${caja.agreed.toLocaleString('es-AR')} · Señas cobradas: ${caja.deposits.toLocaleString('es-AR')} · Saldos cobrados: ${caja.balances.toLocaleString('es-AR')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-product-subtle border border-product-line p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-product-muted mb-2">Ingresos Cobrados</p>
            <p className="text-4xl font-black italic text-product-accent">${totalIngresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-product-subtle border border-product-line p-10 rounded-[3rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-product-muted mb-2">Total Gastos</p>
            <p className="text-4xl font-black italic text-product-danger">-${totalGastos.toLocaleString('es-AR')}</p>
          </div>
          <div className="bg-product-subtle border border-product-line p-10 rounded-[3rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20" style={{ backgroundColor: gananciaNeta >= 0 ? colorP : '#f43f5e' }} />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-product-muted mb-2">Ganancia Neta</p>
            <p className="text-5xl font-black italic" style={{ color: gananciaNeta >= 0 ? colorP : '#f43f5e' }}>
              ${gananciaNeta.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form onSubmit={agregarGasto} className="bg-product-subtle border border-product-line p-10 rounded-[3.5rem] h-fit shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-product-muted mb-8">Registrar Nuevo Gasto</p>
            <div className="space-y-4">
              <div><label htmlFor="expense-date" className="mb-2 block text-sm">Fecha</label><input id="expense-date" type="date" value={fechaGasto} onChange={e => setFechaGasto(e.target.value)} required className="w-full bg-product-subtle border border-product-line p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-product-accent transition-all " /></div>
              <div><label htmlFor="expense-name" className="mb-2 block text-sm">Concepto</label><input id="expense-name" type="text" value={concepto} onChange={e => setConcepto(e.target.value)} required placeholder="EJ: PAGO DE LUZ" className="w-full bg-product-subtle border border-product-line p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-product-accent transition-all placeholder:text-product-muted" /></div>
              <div><label htmlFor="expense-amount" className="mb-2 block text-sm">Monto ($)</label><input id="expense-amount" type="number" min="0.01" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required placeholder="5000" className="w-full bg-product-subtle border border-product-line p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-product-accent transition-all placeholder:text-product-muted" /></div>
              <button type="submit" disabled={guardando} className="w-full mt-4 py-6 rounded-[2.5rem] font-black uppercase italic text-lg text-product-button-ink transition-all hover:scale-105 active:scale-95 shadow-xl" style={{ backgroundColor: colorP }}>{guardando ? 'REGISTRANDO...' : 'REGISTRAR GASTO'}</button>
            </div>
          </form>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-product-muted mb-6 px-4">Historial de Gastos</p>
            {gastosVisibles.length === 0 ? <div className="text-center py-20 border border-dashed border-product-line rounded-[3rem]"><p className="text-product-muted font-black uppercase tracking-widest text-xs">Sin gastos para el período</p></div> : (
              <div className="space-y-3">
                {gastosVisibles.map(g => (
                  <div key={g.id} className="bg-product-subtle border border-product-line p-6 rounded-[2.5rem] flex justify-between items-center group hover:bg-product-subtle transition-all">
                    <div><p className="text-lg font-black uppercase italic text-product-ink">{g.concepto}</p><p className="text-[10px] font-black uppercase text-product-muted tracking-widest mt-1">{g.fecha}</p></div>
                    <div className="text-right flex flex-col items-end"><p className="text-2xl font-black italic text-product-danger">-${Number(g.monto).toLocaleString('es-AR')}</p><button onClick={() => eliminarGasto(g.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 font-black text-[9px] uppercase tracking-widest transition-all bg-rose-500/10 px-3 py-1.5 mt-1 rounded-xl hover:bg-rose-500/20">Eliminar</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>}
      </div>
    </div>
  )
}
