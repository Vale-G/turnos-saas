import { z } from 'zod';

// Esquema para una respuesta de error de la API de MercadoPago
const mpErrorSchema = z.object({
  message: z.string(),
  error: z.string().optional(),
  status: z.number(),
  cause: z.any().optional(),
});

// Clase de error personalizada para los errores de la API de MercadoPago
export class MercadoPagoError extends Error {
  status: number;
  errorType?: string;
  cause?: any;

  constructor(errorData: z.infer<typeof mpErrorSchema>) {
    super(errorData.message);
    this.name = 'MercadoPagoError';
    this.status = errorData.status;
    this.errorType = errorData.error;
    this.cause = errorData.cause;
  }
}

// Interfaz para la salida de la creación de una preferencia
export interface MPPreferenciaOutput {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

// Función para crear un cliente de MercadoPago
export function createMercadoPagoClient(accessToken: string) {
  const API_URL = 'https://api.mercadopago.com';

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const parsedError = mpErrorSchema.safeParse(errorData);

      if (parsedError.success) {
        throw new MercadoPagoError(parsedError.data);
      } else {
        // Si el error de MP no tiene el formato esperado, lanzamos un error genérico
        throw new Error(
          `HTTP error ${response.status}: ${JSON.stringify(errorData)}`
        );
      }
    }

    return response.json();
  }

  return {
    async createPreference(
      body: Record<string, any>
    ): Promise<MPPreferenciaOutput> {
      return request('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  };
}
