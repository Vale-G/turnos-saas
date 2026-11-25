import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import PrintReservation from '@/components/PrintReservation'
import { validUuid } from '@/lib/server/public-booking'
import { createAdminClient, createUserServerClient } from '@/lib/server/supabase'

export const dynamic = 'force-dynamic'

export default async function Receipt({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { id } = await params
  if (!validUuid(id)) notFound()

  const { token } = await searchParams
  if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) redirect(`/cancelar/${id}?token=${token}`)

  const client = await createUserServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return <main className="mx-auto max-w-lg space-y-4 p-6">
    <h1 className="text-2xl font-bold">Comprobante de reserva</h1>
    <p>Ingresá a tu cuenta o abrí el enlace de gestión que recibiste al reservar.</p>
    <Link href="/login" className="underline">Iniciar sesión</Link>
  </main>

  const { data, error } = await createAdminClient().rpc('turnly_server_customer_history', { customer_id: user.id, booking_id: id })
  if (error) return <main className="p-6"><p role="alert">No pudimos cargar el comprobante. Intentá nuevamente.</p></main>
  const reserva = data?.[0]
  if (!reserva) notFound()

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6 print:bg-white print:text-black">
      <h1 className="text-2xl font-bold">Comprobante de reserva</h1>
      <dl className="space-y-3">
        <div><dt>Comercio</dt><dd>{reserva.negocio_nombre}</dd></div>
        <div><dt>Servicio</dt><dd>{reserva.servicio_nombre}</dd></div>
        <div><dt>Fecha y hora</dt><dd>{reserva.fecha} · {reserva.hora.slice(0, 5)}</dd></div>
        <div><dt>Estado</dt><dd>{reserva.estado}</dd></div>
        <div><dt>Código</dt><dd>{id.slice(0, 8).toUpperCase()}</dd></div>
      </dl>
      <PrintReservation />
    </main>
  )
}
