// lib/permisos.ts
// Define qué puede hacer cada plan

export const LIMITES = {
  normal: {
    maxStaff: 2,
    maxServicios: 5,
    mercadopago: false,
    estadisticas: false,
  },
  pro: {
    maxStaff: Infinity,
    maxServicios: Infinity,
    mercadopago: true,
    estadisticas: true,
  },
}

export type Plan = keyof typeof LIMITES

export function puedeAgregar(plan: Plan, tipo: 'staff' | 'servicios', cantidadActual: number): boolean {
  return cantidadActual < LIMITES[plan][`max${tipo.charAt(0).toUpperCase() + tipo.slice(1)}` as keyof typeof LIMITES[Plan]]
}

export function tieneMercadoPago(plan: Plan): boolean {
  return LIMITES[plan].mercadopago
}

export function tieneEstadisticas(plan: Plan): boolean {
  return LIMITES[plan].estadisticas
}
