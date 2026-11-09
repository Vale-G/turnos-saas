'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'
import Image from 'next/image'

type ReservaPublica = {
  id: string; clienteNombre: string; fecha: string; hora: string; estado: string; servicio: string
  negocioId: string; servicioId: string; staffId: string
}
type NegocioPublico = { nombre: string; slug: string; logo_url: string | null; tema: string | null }
type StaffPublico = { id: string; nombre: string }

export default function CancelarTurnoPage() {
  const { id } = useParams<{ id: string }>()
  const token = useSearchParams().get('token') ?? ''
  const [reserva, setReserva] = useState<ReservaPublica | null>(null)
  const [negocio, setNegocio] = useState<NegocioPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState(false)
  const [staff, setStaff] = useState<StaffPublico[]>([])
  const [reprogramando, setReprogramando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [fecha, setFecha] = useState('')
  const [staffId, setStaffId] = useState('')
  const [hora, setHora] = useState('')
  const [horarios, setHorarios] = useState<string[]>([])
  const [buscandoHorarios, setBuscandoHorarios] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const response = await fetch(`/api/public/reservas/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (!response.ok) { if (active) setLoading(false); return }
      const data = await response.json()
      if (active) {
        setReserva(data.reserva); setNegocio(data.negocio); setStaff(data.staff ?? [])
        setFecha(data.reserva.fecha); setStaffId(data.reserva.staffId); setHora(data.reserva.hora.slice(0, 5)); setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id, token])

  useEffect(() => {
    if (!reprogramando || !reserva || !fecha || !staffId) return
    const currentReservation = reserva
    let active = true
    async function loadAvailability() {
      setBuscandoHorarios(true)
      setHora('')
      const query = new URLSearchParams({
        negocioId: currentReservation.negocioId, servicioId: currentReservation.servicioId, staffId, fecha,
        excludeTurnoId: currentReservation.id, token,
      })
      const response = await fetch(`/api/public/disponibilidad?${query}`, { cache: 'no-store' })
      const payload = response.ok ? await response.json() : { horarios: [] }
      if (active) { setHorarios(payload.horarios ?? []); setBuscandoHorarios(false) }
    }
    void loadAvailability()
    return () => { active = false }
  }, [reprogramando, reserva, fecha, staffId, token])

  async function cancelar() {
    setCancelando(true)
    const response = await fetch(`/api/public/reservas/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { method: 'DELETE' })
    setCancelando(false)
    if (!response.ok) { toast.error('No se pudo cancelar el turno'); return }
    setReserva((current) => current ? { ...current, estado: 'cancelado' } : current)
    toast.success('Turno cancelado correctamente')
  }

  async function reprogramar() {
    if (!hora) return toast.error('Elegí un horario disponible')
    setGuardando(true)
    const response = await fetch(`/api/public/reservas/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fecha, hora, staffId }),
    })
    const payload = await response.json().catch(() => ({}))
    setGuardando(false)
    if (!response.ok) return toast.error(payload.error || 'No se pudo reprogramar el turno')
    setReserva((current) => current ? { ...current, fecha, hora: `${hora}:00`, staffId } : current)
    setReprogramando(false)
    toast.success('Turno reprogramado correctamente')
  }

  if (loading) return <div className="min-h-screen bg-[#020617] text-white grid place-items-center font-bold">BUSCANDO TURNO...</div>
  if (!reserva || !negocio) return <div className="min-h-screen bg-[#020617] text-white grid place-items-center p-6 text-center"><div><h1 className="text-3xl font-black mb-2">Enlace inválido</h1><p className="text-slate-400">La reserva no existe o el enlace de gestión ya no es válido.</p></div></div>

  const cancelled = reserva.estado === 'cancelado'
  const color = getThemeColor(negocio.tema)
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 grid place-items-center" style={{ colorScheme: 'dark' }}>
      <main className="max-w-md w-full bg-white/5 border border-white/10 rounded-[3rem] p-9 text-center shadow-2xl">
        {negocio.logo_url ? <Image src={negocio.logo_url} alt={`Logo de ${negocio.nombre}`} width={80} height={80} unoptimized className="w-20 h-20 rounded-2xl object-cover mx-auto mb-6" /> : <div className="w-20 h-20 rounded-2xl grid place-items-center text-3xl font-black mx-auto mb-6" style={{ background: `${color}22`, color }}>{negocio.nombre[0]}</div>}
        {cancelled ? <>
          <div className="text-5xl mb-5">✓</div>
          <h1 className="text-3xl font-black mb-2">Turno cancelado</h1>
          <p className="text-slate-400 mb-7">El horario volvió a quedar disponible.</p>
          <a href={`/reservar/${negocio.slug}`} className="inline-block px-6 py-3 rounded-xl font-bold text-black" style={{ background: color }}>Reservar otro turno</a>
        </> : <>
          <h1 className="text-2xl font-black mb-2">Gestionar reserva</h1>
          <p className="text-slate-400 mb-7">Hola, {reserva.clienteNombre}</p>
          <dl className="bg-black/40 rounded-3xl p-6 text-left space-y-4 mb-7">
            <div><dt className="text-xs text-slate-500 uppercase">Servicio</dt><dd className="font-bold">{reserva.servicio}</dd></div>
            <div className="grid grid-cols-2 gap-4"><div><dt className="text-xs text-slate-500 uppercase">Fecha</dt><dd className="font-bold">{reserva.fecha}</dd></div><div><dt className="text-xs text-slate-500 uppercase">Hora</dt><dd className="font-bold">{reserva.hora.slice(0, 5)}</dd></div></div>
          </dl>
          {reprogramando ? (
            <div className="bg-black/40 rounded-3xl p-5 text-left mb-4 space-y-4">
              <div><label className="block text-xs text-slate-400 uppercase mb-2">Nueva fecha</label><input type="date" min={new Date().toISOString().split('T')[0]} value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-full rounded-xl bg-white/10 border border-white/10 p-3" /></div>
              <div><label className="block text-xs text-slate-400 uppercase mb-2">Profesional</label><select value={staffId} onChange={(event) => setStaffId(event.target.value)} className="w-full rounded-xl bg-slate-900 border border-white/10 p-3">{staff.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}</select></div>
              <div><p className="text-xs text-slate-400 uppercase mb-2">Horario disponible</p>{buscandoHorarios ? <p className="text-sm text-slate-400">Buscando horarios…</p> : horarios.length ? <div className="grid grid-cols-3 gap-2">{horarios.map((slot) => <button type="button" key={slot} onClick={() => setHora(slot)} className={`rounded-xl border p-2 text-sm font-bold ${hora === slot ? 'text-black border-transparent' : 'border-white/10 bg-white/5'}`} style={hora === slot ? { background: color } : {}}>{slot}</button>)}</div> : <p className="text-sm text-amber-300">No hay horarios disponibles ese día.</p>}</div>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setReprogramando(false)} className="rounded-xl border border-white/10 p-3 font-bold">Volver</button><button type="button" onClick={reprogramar} disabled={guardando || !hora} className="rounded-xl p-3 font-bold text-black disabled:opacity-50" style={{ background: color }}>{guardando ? 'Guardando…' : 'Confirmar'}</button></div>
            </div>
          ) : <button onClick={() => setReprogramando(true)} className="w-full py-4 rounded-2xl font-black text-black mb-3" style={{ background: color }}>REPROGRAMAR TURNO</button>}
          <button onClick={cancelar} disabled={cancelando || reprogramando} className="w-full py-4 rounded-2xl bg-rose-600 font-black disabled:opacity-50">{cancelando ? 'CANCELANDO...' : 'CANCELAR TURNO'}</button>
        </>}
      </main>
    </div>
  )
}
