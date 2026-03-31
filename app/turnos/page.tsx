'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { buildWhatsAppConfirmacion } from '@/lib/whatsapp'

const BA_TZ = 'America/Argentina/Buenos_Aires'

function toBaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BA_TZ }).format(date)
}

type TurnoItem = {
  id: string; hora: string; cliente_nombre: string; estado: string; fecha: string
  pago_tipo: string | null; pago_estado: string | null; requiere_sena: boolean; monto_sena: number
  servicio?: { nombre: string; precio: number }; staff?: { nombre: string }
}

export default function AgendaTurnosElite() {
  const [turnos, setTurnos] = useState<TurnoItem[]>([])
  const [negocio, setNegocio] = useState<any>(null)
  const [colorPrincipal, setColorPrincipal] = useState(getThemeColor())
  const [fechaFiltro, setFechaFiltro] = useState(toBaDateStr(new Date()))
  const [vista, setVista] = useState<'dia' | 'semana'>('dia')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  
  const [turnoEditando, setTurnoEditando] = useState<string | null>(null)
  const [qrPago, setQrPago] = useState<string | null>(null)
  const [turnoEditar, setTurnoEditar] = useState<TurnoItem | null>(null)
  
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // FIX STAFF: 1. Buscamos si es empleado
      const { data: adm } = await supabase.from('adminrol').select('*').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id

      // FIX STAFF: 2. Si no es empleado, buscamos si es dueño
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
      }

      // FIX STAFF: 3. Si encontramos local (sea dueño o empleado), lo dejamos entrar
      if (nId) {
        const { data: neg } = await supabase.from('negocio').select('*').eq('id', nId).single()
        if (neg) {
          setNegocio(neg)
          setColorPrincipal(getThemeColor(neg.tema))
        }
      } else {
        // Si no es dueño ni empleado, lo mandamos a crear un local
        router.push('/onboarding')
      }
    }
    init()
  }, [router])

  useEffect(() => {
    if (!negocio?.id) return
    let mounted = true
    async function load() {
      setLoading(true)
      let query = supabase.from('turno').select('*, servicio(nombre, precio), staff(nombre)').eq('negocio_id', negocio.id).order('fecha', { ascending: true }).order('hora', { ascending: true })
      if (vista === 'dia') query = query.eq('fecha', fechaFiltro)
      const { data } = await query
      if (mounted) { setTurnos((data as any[]) ?? []); setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [negocio?.id, fechaFiltro, vista, reloadKey])

  const eliminarTurno = async (id: string) => {
    if (!confirm('¿Estás seguro de que querés ELIMINAR este turno? Esta acción no se puede deshacer.')) return
    await supabase.from('turno').delete().eq('id', id)
    setTurnoEditar(null)
    setTurnoEditando(null)
    toast.success('Turno eliminado correctamente')
    setReloadKey(k => k + 1)
  }

  const guardarEdicion = async () => {
    if (!turnoEditar) return
    const { error } = await supabase.from('turno').update({
      cliente_nombre: turnoEditar.cliente_nombre,
      fecha: turnoEditar.fecha,
      hora: turnoEditar.hora.length === 5 ? turnoEditar.hora + ':00' : turnoEditar.hora,
      estado: turnoEditar.estado,
    }).eq('id', turnoEditar.id)

    if (error) {
      toast.error('Error al guardar: ' + error.message)
      return
    }

    setTurnoEditar(null)
    toast.success('Turno actualizado')
    setReloadKey(k => k + 1)
  }

  const cambiarEstado = async (id: string, estado: string) => { await supabase.from('turno').update({ estado }).eq('id', id); setReloadKey(k=>k+1) }
  const registrarPago = async (id: string, tipo: string) => { await supabase.from('turno').update({ pago_tipo: tipo, pago_estado: 'cobrado', estado: 'completado' }).eq('id', id); setTurnoEditando(null); toast.success('Cobrado'); setReloadKey(k=>k+1) }
  
  const abrirWhatsApp = (t: TurnoItem) => {
    const partes = t.cliente_nombre.split('·')
    const telefono = partes.length > 1 ? partes[1].trim() : null
    if (!telefono) return toast.error('El cliente no dejó un teléfono válido')
    const url = buildWhatsAppConfirmacion(telefono, negocio?.nombre || 'Nuestra Barbería', t.fecha, t.hora.slice(0,5))
    window.open(url, '_blank')
  }

  const generarQR = async (t: TurnoItem) => {
    setQrPago('loading')
    const monto = (t.servicio?.precio || 0) - (t.monto_sena || 0)
    if (monto <= 0) { toast.error('El turno ya está totalmente saldado'); setQrPago(null); return }
    
    const res = await fetch('/api/pago-local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turno_id: t.id, monto, concepto: 'Resto de ' + t.servicio?.nombre }) })
    const data = await res.json()
    if (data.url) setQrPago(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.url)}`)
    else { toast.error('Error: ' + data.error); setQrPago(null) }
  }

  const estadoColor = (e: string) => ({ confirmado: 'bg-emerald-500', pendiente: 'bg-amber-500', cancelado: 'bg-rose-500', completado: 'bg-slate-400' })[e] ?? 'bg-slate-500'

  if (loading && !turnos.length) return <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black text-2xl animate-pulse">AGENDA...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div><button onClick={() => router.push('/dashboard')} className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-4 hover:text-white">← Dashboard</button><h1 className="text-6xl font-black uppercase italic tracking-tighter" style={{ color: colorPrincipal }}>Agenda</h1></div>
          <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl"><input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} className="bg-transparent text-sm font-black uppercase outline-none px-4 [&::-webkit-calendar-picker-indicator]:invert cursor-pointer" /></div>
        </header>

        {turnoEditar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#020617] border border-white/10 rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h3 className="font-black italic uppercase text-2xl tracking-tighter" style={{ color: colorPrincipal }}>Editar Turno</h3>
                <button onClick={() => setTurnoEditar(null)} className="text-slate-500 hover:text-white font-black w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-colors">X</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Cliente (Nombre · Teléfono)</label>
                  <input type="text" value={turnoEditar.cliente_nombre} onChange={e => setTurnoEditar({ ...turnoEditar, cliente_nombre: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-white/30 transition-colors placeholder:text-slate-700" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Fecha</label>
                    <input type="date" value={turnoEditar.fecha} onChange={e => setTurnoEditar({ ...turnoEditar, fecha: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-2">Hora</label>
                    <input type="time" value={turnoEditar.hora.slice(0, 5)} onChange={e => setTurnoEditar({ ...turnoEditar, hora: e.target.value + ':00' })} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-10">
                <button onClick={() => eliminarTurno(turnoEditar.id)} className="flex-1 py-4 rounded-[2rem] font-black uppercase text-xs border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all">Eliminar</button>
                <button onClick={guardarEdicion} className="flex-1 py-4 rounded-[2rem] font-black uppercase italic text-sm text-black transition-all hover:scale-105" style={{ backgroundColor: colorPrincipal }}>Guardar</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {turnos.length === 0 ? <p className="text-center py-20 text-slate-600 font-black text-xs uppercase tracking-widest">Sin Turnos</p> : turnos.map(t => (
            <div key={t.id} className="rounded-[2.5rem] border border-white/10 bg-white/5 overflow-hidden">
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className={'w-2 h-14 rounded-full ' + estadoColor(t.estado)} />
                  <p className="text-2xl font-black italic w-16" style={{ color: colorPrincipal }}>{t.hora.slice(0, 5)}</p>
                  <div>
                    <p className="font-black uppercase text-base">{t.cliente_nombre.split('·')[0]}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.servicio?.nombre}</p>
                    <p className="text-[9px] font-black uppercase mt-1 text-amber-400">{t.pago_estado === 'cobrado' ? '✅ COBRADO' : t.requiere_sena ? `SEÑA ABONADA ($${t.monto_sena})` : 'SIN COBRAR'} | Total: ${t.servicio?.precio}</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => abrirWhatsApp(t)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm" title="Enviar WhatsApp">💬</button>
                  <button onClick={() => setTurnoEditar({ ...t })} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-all text-slate-300">Editar</button>
                  <button onClick={() => { setTurnoEditando(turnoEditando === t.id ? null : t.id); setQrPago(null) }} className="px-5 py-3 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 transition-all text-slate-300">Cobro</button>
                </div>
              </div>
              
              {turnoEditando === t.id && (
                <div className="p-6 bg-black/40 border-t border-white/5 flex flex-col md:flex-row gap-8 animate-in slide-in-from-top-2">
                  <div className="flex-1 space-y-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Estado</p>
                      <div className="flex gap-2 flex-wrap">{['pendiente', 'confirmado', 'cancelado'].map(e => <button key={e} onClick={()=>cambiarEstado(t.id, e)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${t.estado===e?'text-black border-transparent shadow-lg':'text-slate-400 border-white/10 hover:bg-white/5'}`} style={t.estado===e?{backgroundColor:colorPrincipal}:{}}>{e}</button>)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Registrar Pago Manual</p>
                      <div className="flex gap-2 flex-wrap">{['efectivo', 'transferencia', 'mercadopago'].map(tipo => <button key={tipo} onClick={()=>registrarPago(t.id, tipo)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">{tipo === 'mercadopago' ? 'MP' : tipo}</button>)}</div>
                    </div>
                  </div>
                  
                  <div className="md:w-64 bg-white/5 border border-white/10 p-6 rounded-3xl text-center flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4">Cobrar Resto con QR</p>
                    {qrPago === 'loading' ? <div className="w-32 h-32 flex items-center justify-center font-black animate-pulse text-xs bg-black/30 rounded-xl">GENERANDO...</div> 
                     : qrPago ? <img src={qrPago} className="w-32 h-32 rounded-xl mb-4 bg-white p-2" alt="QR" /> 
                     : <button onClick={() => generarQR(t)} className="px-6 py-4 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl font-black uppercase text-[10px] hover:bg-blue-500 hover:text-white transition-all w-full">Generar QR</button>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
