export type PaidPlan = 'basico' | 'pro'
export type CommercialPlan = PaidPlan | 'trial'

export type SubscriptionSummary = {
  plan: PaidPlan | null
  effectivePlan: CommercialPlan | null
  state: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  trialEnd: string | null
  periodStart: string | null
  periodEnd: string | null
  requestedPlan: PaidPlan | null
  autoRenew: boolean
  cancelPending: boolean
  limits: { staff: number; services: number; advanced: boolean }
  usage: { staff: number; services: number }
  catalog: { id: CommercialPlan; staff_limit: number; service_limit: number; advanced: boolean }[]
  payments: { status: string; plan: string; amount: number; currency: string | null; at: string }[]
}

export const planNames: Record<CommercialPlan, string> = { basico: 'Básico', pro: 'Pro', trial: 'Prueba' }
export const stateNames: Record<SubscriptionSummary['state'], string> = {
  trialing: 'En prueba', active: 'Activa', past_due: 'Pago atrasado', canceled: 'Cancelada', expired: 'Vencida',
}

export function daysLeft(ends: string | null) {
  return ends ? Math.max(0, Math.ceil((Date.parse(ends) - Date.now()) / 86400000)) : 0
}
