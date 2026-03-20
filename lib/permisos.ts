import { PLANES, getPlanEfectivo, diasTrialRestantes } from './planes'
export type Plan = 'normal' | 'pro'
export type { PlanId } from './planes'
export { PLANES, getPlanEfectivo, diasTrialRestantes }

export const LIMITES = {
  normal: { maxStaff: 2,   maxServicios: 5,   mercadopago: false, estadisticas: false },
  pro:    { maxStaff: 999, maxServicios: 999, mercadopago: true,  estadisticas: true  },
  trial:  { maxStaff: 999, maxServicios: 999, mercadopago: true,  estadisticas: true  },
  basico: { maxStaff: 2,   maxServicios: 5,   mercadopago: false, estadisticas: false },
}

export function puedeAgregarStaff(plan: string, cantidad: number): boolean {
  const limite = LIMITES[plan as keyof typeof LIMITES] ?? LIMITES.normal
  return cantidad < limite.maxStaff
}

export function puedeAgregarServicio(plan: string, cantidad: number): boolean {
  const limite = LIMITES[plan as keyof typeof LIMITES] ?? LIMITES.normal
  return cantidad < limite.maxServicios
}

export function tieneMercadoPago(plan: string): boolean {
  return plan === 'pro' || plan === 'trial'
}

export function tieneEstadisticas(plan: string): boolean {
  return plan === 'pro' || plan === 'trial'
}
