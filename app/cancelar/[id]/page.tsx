'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'
import Image from 'next/image'

type ReservaPublica = { id: string; clienteNombre: string; fecha: string; hora: string; estado: string; servicio: string }
type NegocioPublico = { nombre: string; slug: string; logo_url: string | null; tema: string | null }

export default function CancelarTurnoPage() {
  const { id } = useParams<{ id: string }>()
  const token = useSearchParams().get('token') ?? ''
  const [reserva, setReserva] = useState<ReservaPublica | null>(null)
  const [negocio, setNegocio] = useState<NegocioPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const response = await fetch(`/api/public/reservas/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (!response.ok) { if (active) setLoading(false); return }
      const data = await response.json()
      if (active) { setReserva(data.reserva); setNegocio(data.negocio); setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [id, token])

  async function cancelar() {
    setCancelando(true)
    const response = await fetch(`/api/public/reservas/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { method: 'DELETE' })
    setCancelando(false)
    if (!response.ok) { toast.error('No se pudo cancelar el turno'); return }
    setReserva((current) => current ? { ...current, estado: 'cancelado' } : current)
    toast.success('Turno cancelado correctamente')
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
          <button onClick={cancelar} disabled={cancelando} className="w-full py-5 rounded-2xl bg-rose-600 font-black disabled:opacity-50">{cancelando ? 'CANCELANDO...' : 'CANCELAR TURNO'}</button>
        </>}
      </main>
    </div>
  )
}
