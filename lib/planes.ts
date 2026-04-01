export type PlanId = 'trial' | 'basico' | 'pro'

export type PlanConfig = {
  id: PlanId
  nombre: string
  precio: number
  maxStaff: number
  maxServicios: number
  informes: boolean
  clientes: boolean
  mercadopago: boolean
}

export const DEFAULT_PLAN_ID: PlanId = 'basico'

export const PLANES: Record<PlanId, PlanConfig> = {
  trial: {
    id: 'trial',
    nombre: 'Trial',
    precio: 0,
    maxStaff: 999,
    maxServicios: 999,
    informes: true,
    clientes: true,
    mercadopago: true,
  },
  basico: {
    id: 'basico',
    nombre: 'Basico',
    precio: 5000,
    maxStaff: 2,
    maxServicios: 5,
    informes: false,
    clientes: false,
    mercadopago: false,
  },
  pro: {
    id: 'pro',
    nombre: 'Pro',
    precio: 25000,
    maxStaff: 999,
    maxServicios: 999,
    informes: true,
    clientes: true,
    mercadopago: true,
  },
}

export const PLANES_LISTA: PlanConfig[] = Object.values(PLANES)

export function isPlanId(value?: string | null): value is PlanId {
  if (!value) return false
  return value in PLANES
}

export function getPlan(planId?: string | null): PlanConfig {
  if (isPlanId(planId)) {
    return PLANES[planId]
  }
  return PLANES[DEFAULT_PLAN_ID]
}

export function getPlanEfectivo(suscripcion_tipo?: string | null, trial_hasta?: string | null): PlanId {
  if (suscripcion_tipo === 'pro') return 'pro'
  if (suscripcion_tipo === 'basico') return 'basico'
  if (trial_hasta && new Date(trial_hasta) > new Date()) return 'trial'
  return DEFAULT_PLAN_ID
}

export function diasTrialRestantes(trial_hasta?: string | null): number {
  if (!trial_hasta) return 0
  const diff = new Date(trial_hasta).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}
