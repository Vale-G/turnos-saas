import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { senaSchema } from '@/lib/validations/sena';
import { crearPreferenciaSena } from '@/lib/mercadopago';
import { env } from '@/lib/env';

type SenaInput = z.infer<typeof senaSchema>;

class SenaError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'SenaError';
  }
}

export async function createSenaPreference(
  supabase: SupabaseClient,
  input: SenaInput,
  origin: string
) {
  const { turno_id, monto_sena } = input;

  const { data: turno, error: turnoError } = await supabase
    .from('turno')
    .select('*, negocio:negocio_id(mp_access_token)')
    .eq('id', turno_id)
    .single();

  if (turnoError || !turno) {
    throw new SenaError('Turno no encontrado', 404);
  }

  const ownerToken = turno.negocio?.mp_access_token;
  if (!ownerToken) {
    throw new SenaError('El negocio no tiene configurado MercadoPago', 400);
  }

  const preferencia = await crearPreferenciaSena({
    turnoId: input.turno_id,
    montoSena: input.monto_sena,
    servicioNombre: input.servicio_nombre,
    negocioNombre: input.negocio_nombre,
    clienteEmail: input.cliente_email || '',
    origin,
    ownerToken,
  });

  const { error: updateError } = await supabase
    .from('turno')
    .update({
      mp_preference_id: preferencia.id,
      requiere_sena: true,
      monto_sena,
    })
    .eq('id', turno_id);

  if (updateError) {
    // Log the error for debugging, but the user doesn't need to know the details
    console.error('[SenaService] Failed to update turno:', updateError);
    throw new SenaError('Error al guardar la preferencia de pago', 500);
  }

  const url =
    env.NODE_ENV === 'production'
      ? preferencia.init_point
      : preferencia.sandbox_init_point;

  return { url };
}
