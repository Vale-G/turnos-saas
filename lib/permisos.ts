export const LIMITES = {
  normal: {
    maxStaff: 2,
    maxServicios: 5,
    mercadopago: false,
    estadisticas: false,
  },
  pro: {
    maxStaff: 999,
    maxServicios: 999,
    mercadopago: true,
    estadisticas: true,
  },
}

export const PLANES = LIMITES

export type Plan = keyof typeof LIMITES

export function puedeAgregarStaff(plan: Plan, cantidadActual: number): boolean {
  return cantidadActual < LIMITES[plan].maxStaff
}

export function puedeAgregarServicio(plan: Plan, cantidadActual: number): boolean {
  return cantidadActual < LIMITES[plan].maxServicios
}

export function tieneMercadoPago(plan: Plan): boolean {
  return LIMITES[plan].mercadopago
}

export function tieneEstadisticas(plan: Plan): boolean {
  return LIMITES[plan].estadisticas
}
