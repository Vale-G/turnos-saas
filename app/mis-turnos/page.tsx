'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Reservation = { id: string; fecha: string; hora: string; estado: string; negocio_nombre: string; servicio_nombre: string }
export default function CustomerHistory() {
  const [items, setItems] = useState<Reservation[]>([])
  const [message, setMessage] = useState('Cargando reservas…')
  useEffect(() => {
    let active = true
    void fetch('/api/customer/reservations', { cache: 'no-store' }).then(async response => {
      const body = await response.json()
      if (!active) return
      if (!response.ok) { setMessage(body.error ?? 'No se pudieron cargar las reservas'); return }
      setItems(body.reservations); setMessage(body.reservations.length ? '' : 'Todavía no tenés reservas asociadas a esta cuenta.')
    }).catch(() => { if (active) setMessage('No se pudieron cargar las reservas. Volvé a intentar.') })
    return () => { active = false }
  }, [])
  return <main className="min-h-screen bg-slate-950 text-white p-6"><div className="max-w-3xl mx-auto"><Link href="/login" className="text-indigo-300">Ingresar</Link><h1 className="text-3xl font-bold my-6">Mis reservas</h1><p role="status">{message}</p><p className="text-slate-400 mb-6">Para cancelar o reprogramar, utilizá el enlace privado de confirmación. Las reservas sin cuenta no se vinculan automáticamente por email.</p><ul className="space-y-4">{items.map(item => <li key={item.id} className="rounded-2xl border border-slate-700 p-5"><h2 className="font-bold">{item.negocio_nombre} · {item.servicio_nombre}</h2><p>{item.fecha} · {item.hora.slice(0,5)}</p><p>{item.estado}</p></li>)}</ul></div></main>
}
