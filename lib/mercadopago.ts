import { createMercadoPagoClient, type MPPreferenciaOutput } from './mercadopago/client';
import { env } from './env';
import {
  CURRENCY_ID,
  AUTO_RETURN,
  STATEMENT_DESCRIPTOR_APP,
  STATEMENT_DESCRIPTOR_SENA,
  DEFAULT_PAYER_EMAIL,
  EXTERNAL_REFERENCE_SENA_SUFFIX,
} from './mercadopago/constants';

// Tipos de entrada para las funciones de creación de preferencias
export type MPPreferenciaInput = {
  titulo: string;
  precio: number;
  turnoId: string;
  clienteEmail: string;
  clienteNombre: string;
  backUrls: { success: string; failure: string; pending: string };
};

export type MPSenaPreferenciaInput = {
  turnoId: string;
  montoSena: number;
  servicioNombre: string;
  negocioNombre: string;
  clienteEmail: string;
  origin: string;
  ownerToken: string;
};

// Función refactorizada para crear una preferencia de pago general
export async function crearPreferenciaMercadoPago(
  input: MPPreferenciaInput
): Promise<MPPreferenciaOutput> {
  const mpClient = createMercadoPagoClient(env.MP_ACCESS_TOKEN);

  const body = {
    items: [
      {
        title: input.titulo,
        quantity: 1,
        unit_price: input.precio,
        currency_id: CURRENCY_ID,
      },
    ],
    payer: { email: input.clienteEmail, name: input.clienteNombre },
    external_reference: input.turnoId,
    back_urls: input.backUrls,
    auto_return: AUTO_RETURN,
    notification_url: `${env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`,
    statement_descriptor: STATEMENT_DESCRIPTOR_APP,
  };

  return mpClient.createPreference(body);
}

// Función refactorizada para crear una preferencia de seña
export async function crearPreferenciaSena(
  input: MPSenaPreferenciaInput
): Promise<MPPreferenciaOutput> {
  const { ownerToken, ...rest } = input;
  const mpClient = createMercadoPagoClient(ownerToken);

  const body = {
    items: [
      {
        title: `Seña — ${rest.servicioNombre}`,
        description: `Seña para turno en ${rest.negocioNombre}`,
        quantity: 1,
        unit_price: rest.montoSena,
        currency_id: CURRENCY_ID,
      },
    ],
    payer: { email: rest.clienteEmail || DEFAULT_PAYER_EMAIL },
    external_reference: `${rest.turnoId}${EXTERNAL_REFERENCE_SENA_SUFFIX}`,
    back_urls: {
      success: `${rest.origin}/reservar/sena-ok?turno=${rest.turnoId}`,
      failure: `${rest.origin}/reservar/sena-error?turno=${rest.turnoId}`,
      pending: `${rest.origin}/reservar/sena-pendiente?turno=${rest.turnoId}`,
    },
    auto_return: AUTO_RETURN,
    notification_url: `${rest.origin}/api/webhooks/sena`,
    statement_descriptor: STATEMENT_DESCRIPTOR_SENA,
  };

  return mpClient.createPreference(body);
}
