'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BUSINESS_TIME_ZONE, todayInTimeZone } from '@/lib/local-date.mjs'
import { supabase } from '@/lib/supabase'

type Appointment = { id: string; hora: string; cliente_nombre: string; estado: string }

export function TodayAgenda({ business }: { business: string }) {
  const [rows, setRows] = useState<Appointment[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const date = todayInTimeZone(BUSINESS_TIME_ZONE, now)
  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      const result = await supabase.from('turno').select('id,hora,cliente_nombre,estado')
        .eq('negocio_id', business).eq('fecha', date).gte('hora', time)
        .in('estado', ['pendiente', 'confirmado']).order('hora').order('id').limit(4)
      if (active) {
        setFailed(Boolean(result.error))
        setRows(result.data)
      }
    }
    void load()
    return () => { active = false }
  }, [business, date, time])

  return <section className="today-agenda my-6 rounded-2xl border p-5">
    <header className="flex flex-wrap items-baseline justify-between gap-3">
      <div><p>{new Intl.DateTimeFormat('es-AR', { timeZone: BUSINESS_TIME_ZONE, dateStyle: 'full' }).format(now)}</p>
        <h2 className="text-2xl font-semibold">Próximos turnos de hoy</h2></div>
      <Link className="underline" href={'/turnos?fecha=' + date}>Abrir agenda</Link>
    </header>
    {failed ? <p role="alert">No pudimos consultar los próximos turnos.</p>
      : rows === null ? <p role="status">Consultando la agenda…</p>
      : rows.length === 0 ? <p className="mt-4">No quedan turnos pendientes o confirmados para hoy.</p>
      : <ul>{rows.map(row => <li key={row.id}>
        <Link className="mt-3 flex flex-wrap items-baseline gap-3 border-t py-3" href={'/turnos?fecha=' + date + '&turno=' + row.id}>
          <strong>{row.hora.slice(0, 5)}</strong><span className="grow break-words">{row.cliente_nombre}</span><span>{row.estado}</span>
        </Link></li>)}</ul>}
  </section>
}
