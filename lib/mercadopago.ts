export type MPPreferenciaInput = {
  titulo: string
  precio: number
  turnoId: string
  clienteEmail: string
  clienteNombre: string
  backUrls: { success: string; failure: string; pending: string }
}

export type MPPreferenciaOutput = {
  id: string
  init_point: string
  sandbox_init_point: string
}

export async function crearPreferenciaMercadoPago(input: MPPreferenciaInput): Promise<MPPreferenciaOutput> {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado')

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      items: [{ title: input.titulo, quantity: 1, unit_price: input.precio, currency_id: 'ARS' }],
      payer: { email: input.clienteEmail, name: input.clienteNombre },
      external_reference: input.turnoId,
      back_urls: input.backUrls,
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
      statement_descriptor: 'BARBUCHO',
    }),
  })

  if (!res.ok) throw new Error(`MercadoPago error: ${await res.text()}`)
  return res.json()
}
