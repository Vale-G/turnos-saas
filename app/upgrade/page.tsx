'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { daysLeft, planNames, stateNames, type PaidPlan, type SubscriptionSummary } from '@/lib/commercial-subscription'

const date = (value: string) => new Date(value).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })

export default function SubscriptionPage() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null)
  const [message, setMessage] = useState('')
  const [acknowledgeRenewal, setAcknowledgeRenewal] = useState(false)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, plan, acknowledgeRenewal }),
      })
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (result.status === 'checkout' && typeof result.url === 'string') {
        window.location.assign(result.url)
        return
      }
      const messages: Record<string, string> = {
        paid_period: 'Podés autorizar el próximo plan al finalizar el período pagado. Conservás el acceso hasta esa fecha.',
        open_mandate: 'Cancelá la renovación anterior y esperá su confirmación. Podés contratar el nuevo plan al finalizar el período pagado.',
        price: 'El precio comercial de este plan todavía no está disponible.',
        reconciling: 'Estamos verificando la autorización. Si no aparece, contactá a soporte antes de volver a iniciar un pago.',
        authorized: 'Autorización registrada. El acceso cambia al confirmarse el pago del período.',
        canceled: 'Mercado Pago confirmó la baja. Conservás el acceso ya pagado.',
        pending: 'La baja está pendiente de confirmación.',
        no_mandate: 'No hay una autorización recurrente para cancelar.',
      }
      setMessage(messages[result.status ?? result.outcome] ?? 'Solicitud registrada.')
      const refresh = await fetch('/api/suscripcion', { cache: 'no-store' })
      if (refresh.ok) setSummary(await refresh.json())
    } catch { setMessage('No pudimos registrar la solicitud. Volvé a intentar.') }
    finally { setBusy(false) }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-7 p-6 text-product-ink">
      <Link className="underline" href="/dashboard">Volver al panel</Link>
      <h1 className="text-3xl font-bold">Mi suscripción</h1>
      {message && <p role="status">{message}</p>}
      {!summary && !message && <p role="status">Cargando suscripción…</p>}
      {summary && <>
        <section className="space-y-3 rounded-2xl border border-product-line p-5">
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
          {(summary.autoRenew || summary.mandate) && !summary.cancelPending && <button className="min-h-11 underline" disabled={busy}
            onClick={() => void request('cancel_renewal')}>Solicitar cancelación de renovación</button>}
          {summary.cancelPending && <p>La renovación sigue activa hasta la confirmación del proveedor. El acceso pagado dura hasta el cierre del período.</p>}
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cambio de plan</h2>
          <p>{summary.billingEnabled
            ? 'Ambiente de prueba. Si hay un período pagado, la contratación del nuevo plan se habilita al vencer.'
            : 'La facturación todavía no está habilitada. Podés registrar una solicitud sin cobro. Los precios están pendientes de aprobación.'}</p>
          {summary.billingEnabled && <label className="flex items-start gap-3 py-2">
            <input className="mt-1" type="checkbox" checked={acknowledgeRenewal} onChange={event => setAcknowledgeRenewal(event.target.checked)} />
            <span>Entiendo que la autorización se renueva mensualmente. Mercado Pago muestra el importe antes de confirmar. Puedo cancelar próximas renovaciones desde esta pantalla.</span>
          </label>}
          {summary.requestedPlan && <p>Plan solicitado: {planNames[summary.requestedPlan]}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.catalog.filter(item => item.id !== 'trial').map(item => (
              <div key={item.id} className="space-y-2 rounded-xl border border-product-line p-4">
                <h3 className="font-bold">{planNames[item.id]}</h3>
                <p>{item.staff_limit} profesionales y {item.service_limit} servicios.</p>
                <p>{item.advanced ? 'Agenda, Informes avanzados, Control de caja y notas de clientes.' : 'Agenda, reservas y gestión esencial.'}</p>
                <button className="min-h-11 underline" disabled={busy || (summary.billingEnabled ? !acknowledgeRenewal : summary.requestedPlan === item.id)}
                  onClick={() => void request('change_plan', item.id as PaidPlan)}>{summary.billingEnabled ? 'Continuar con' : 'Solicitar'} {planNames[item.id]}</button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Historial de pagos</h2>
          {!summary.payments.length && <p>Todavía no hay pagos registrados.</p>}
          <ul className="space-y-2">
            {summary.payments.map((payment, index) => <li key={index} className="rounded-lg border border-product-line p-3">
              {date(payment.at)} · {payment.plan} · {payment.amount} {payment.currency ?? '(moneda histórica sin verificar)'} · {({ pending: 'Pendiente', rejected: 'Rechazado', approved: 'Aprobado' } as Record<string, string>)[payment.status] ?? payment.status}
            </li>)}
          </ul>
        </section>
      </>}
    </main>
  )
}
