import { z } from 'zod';

export const senaSchema = z.object({
  turno_id: z.string().uuid('ID de turno inválido'),
  monto_sena: z.number().positive('El monto de la seña debe ser positivo'),
  servicio_nombre: z.string().min(1, 'El nombre del servicio es requerido'),
  negocio_nombre: z.string().min(1, 'El nombre del negocio es requerido'),
  cliente_email: z
    .string()
    .email('Email de cliente inválido')
    .optional()
    .or(z.literal('')),
});
