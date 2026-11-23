'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { daysLeft, planNames, stateNames, type PaidPlan, type SubscriptionSummary } from '@/lib/commercial-subscription'

const date = (value: string) => new Date(value).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })

export default function SubscriptionPage() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const control = new AbortController()
    fetch('/api/suscripcion', { cache: 'no-store', signal: control.signal }).then(async result => {
      if (!result.ok) throw new Error()
      setSummary(await result.json())
    }).catch(() => { if (!control.signal.aborted) setMessage('No pudimos consultar la suscripción.') })
    return () => control.abort()
  }, [])

  async function request(action: 'change_plan' | 'cancel_renewal', plan?: PaidPlan) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/suscripcion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, plan }),
      })
      if (!response.ok) throw new Error()
      setMessage('Solicitud registrada.')
      const refresh = await fetch('/api/suscripcion', { cache: 'no-store' })
      if (refresh.ok) setSummary(await refresh.json())
    } catch { setMessage('No pudimos registrar la solicitud. Volvé a intentar.') }
    finally { setBusy(false) }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-7 p-6 text-white">
      <Link className="underline" href="/dashboard">Volver al panel</Link>
      <h1 className="text-3xl font-bold">Mi suscripción</h1>
      {message && <p role="status">{message}</p>}
      {!summary && !message && <p role="status">Cargando suscripción…</p>}
      {summary && <>
        <section className="space-y-3 rounded-2xl border border-slate-700 p-5">
          <h2 className="text-xl font-semibold">Estado y consumo</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt>Estado</dt><dd>{stateNames[summary.state]}</dd></div>
            <div><dt>Plan contratado</dt><dd>{summary.plan ? planNames[summary.plan] : 'Sin contratación'}</dd></div>
            <div><dt>Acceso vigente</dt><dd>{summary.effectivePlan ? planNames[summary.effectivePlan] : 'Agenda existente y datos del comercio'}</dd></div>
            <div><dt>Renovación automática</dt><dd>{summary.cancelPending ? 'Cancelación solicitada' : summary.autoRenew ? 'Activa' : 'Desactivada'}</dd></div>
            {summary.periodStart && <div><dt>Inicio del período</dt><dd>{date(summary.periodStart)}</dd></div>}
            {summary.periodEnd && <div><dt>Fin del período pagado</dt><dd>{date(summary.periodEnd)}</dd></div>}
            {summary.effectivePlan === 'trial' && summary.trialEnd && <div><dt>Fin de la prueba</dt><dd>{date(summary.trialEnd)} · {daysLeft(summary.trialEnd)} días restantes</dd></div>}
            <div><dt>Profesionales</dt><dd>{summary.usage.staff} / {summary.limits.staff}</dd></div>
            <div><dt>Servicios</dt><dd>{summary.usage.services} / {summary.limits.services}</dd></div>
          </dl>
          {summary.limits.advanced && <p>Incluye informes, operaciones de caja y notas avanzadas de clientes.</p>}
          <p>Al vencer el acceso se conservan tus datos y podés gestionar los turnos existentes. Se cierran las reservas nuevas y las altas de profesionales y servicios.</p>
          {summary.autoRenew && !summary.cancelPending && <button className="min-h-11 underline" disabled={busy}
            onClick={() => void request('cancel_renewal')}>Solicitar cancelación de renovación</button>}
          {summary.cancelPending && <p>La renovación sigue activa hasta la confirmación del proveedor. El acceso pagado dura hasta el cierre del período.</p>}
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cambio de plan</h2>
          <p>La facturación todavía no está habilitada. Podés registrar una solicitud sin cobro. Los precios están pendientes de aprobación.</p>
          {summary.requestedPlan && <p>Plan solicitado: {planNames[summary.requestedPlan]}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.catalog.filter(item => item.id !== 'trial').map(item => (
              <div key={item.id} className="space-y-2 rounded-xl border border-slate-700 p-4">
                <h3 className="font-bold">{planNames[item.id]}</h3>
                <p>{item.staff_limit} profesionales y {item.service_limit} servicios.</p>
                <p>{item.advanced ? 'Agenda, Informes avanzados, Control de caja y notas de clientes.' : 'Agenda, reservas y gestión esencial.'}</p>
                <button className="min-h-11 underline" disabled={busy || summary.requestedPlan === item.id}
                  onClick={() => void request('change_plan', item.id as PaidPlan)}>Solicitar {planNames[item.id]}</button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Historial de pagos</h2>
          {!summary.payments.length && <p>Todavía no hay pagos registrados.</p>}
          <ul className="space-y-2">
            {summary.payments.map((payment, index) => <li key={index} className="rounded-lg border border-slate-700 p-3">
              {date(payment.at)} · {payment.plan} · {payment.amount} {payment.currency ?? '(moneda histórica sin verificar)'} · {({ pending: 'Pendiente', rejected: 'Rechazado', approved: 'Aprobado' } as Record<string, string>)[payment.status] ?? payment.status}
            </li>)}
          </ul>
        </section>
      </>}
    </main>
  )
}
