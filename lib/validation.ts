import { z } from 'zod'

export const strictTextSchema = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres')
  .max(80, 'Debe tener como máximo 80 caracteres')
  .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s.'-]+$/, 'Formato inválido')

export const strictEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido')
  .max(120, 'Email inválido')

export const strictPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^\d+]/g, ''))
  .refine((value) => /^\+?[1-9]\d{7,14}$/.test(value), 'Teléfono inválido')

export const loginSchema = z.object({
  email: strictEmailSchema,
  password: z
    .string()
    .min(8, 'Contraseña inválida')
    .max(128, 'Contraseña inválida'),
})

export const registroSchema = z.object({
  nombreNegocio: strictTextSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .max(50, 'El slug es demasiado largo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  email: strictEmailSchema,
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128, 'Contraseña inválida'),
})

export const onboardingSchema = z.object({
  nombre: strictTextSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'El slug debe tener al menos 3 caracteres')
    .max(50, 'El slug es demasiado largo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  whatsapp: strictPhoneSchema.optional().or(z.literal('')),
})

export const reservaInvitadoSchema = z.object({
  nombre: strictTextSchema,
  tel: strictPhoneSchema,
  correoInvitado: strictEmailSchema,
})
