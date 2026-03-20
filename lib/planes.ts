export type PlanId = 'trial' | 'basico' | 'pro'

export const PLANES = {
  trial:  { id: 'trial',  nombre: 'Trial',  precio: 0,     maxStaff: 999, maxServicios: 999, informes: true,  clientes: true,  mercadopago: true  },
  basico: { id: 'basico', nombre: 'Basico', precio: 5000,  maxStaff: 2,   maxServicios: 5,   informes: false, clientes: false, mercadopago: false },
  pro:    { id: 'pro',    nombre: 'Pro',    precio: 25000, maxStaff: 999, maxServicios: 999, informes: true,  clientes: true,  mercadopago: true  },
} as const

export function getPlanEfectivo(suscripcion_tipo: string, trial_hasta?: string | null): PlanId {
  if (suscripcion_tipo === 'pro') return 'pro'
  if (suscripcion_tipo === 'basico') return 'basico'
  if (trial_hasta && new Date(trial_hasta) > new Date()) return 'trial'
  return 'basico'
}

export function diasTrialRestantes(trial_hasta?: string | null): number {
  if (!trial_hasta) return 0
  const diff = new Date(trial_hasta).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}
