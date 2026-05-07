/**
 * Este archivo centraliza las constantes utilizadas en la integración con MercadoPago.
 * Ayuda a evitar "valores mágicos" y facilita el mantenimiento.
 */

// Moneda utilizada para las transacciones. Por ahora, solo Pesos Argentinos.
export const CURRENCY_ID = 'ARS';

// Redirección automática al sitio del comerciante después del pago.
export const AUTO_RETURN = 'approved';

// Descriptor que aparecerá en el resumen de la tarjeta del cliente.
export const STATEMENT_DESCRIPTOR_APP = 'TURNLY';
export const STATEMENT_DESCRIPTOR_SENA = 'TURNLY SENA';

// Email por defecto para los pagadores que no proporcionan uno.
export const DEFAULT_PAYER_EMAIL = 'invitado@turnly.app';

// Sufijo para la referencia externa para identificar pagos de señas.
export const EXTERNAL_REFERENCE_SENA_SUFFIX = '|sena';
