export async function persistBusinessToken(admin, negocioId, payload) {
  const { error: upsertError } = await admin
    .from('mercadopago_connection')
    .upsert(payload, { onConflict: 'negocio_id' })

  if (upsertError) {
    throw new Error('No se pudo guardar la conexión de Mercado Pago')
  }

  const { error: cleanupError } = await admin
    .from('negocio')
    .update({ mp_access_token: null })
    .eq('id', negocioId)

  if (cleanupError) {
    throw new Error('La conexión se guardó, pero no se pudo eliminar la credencial anterior')
  }
}
