export type BusinessPlan = {
  suscripcion_tipo?: string | null
  trial_hasta?: string | null
}

export function hasProAccess(plan: BusinessPlan, now = new Date()): boolean {
  if (plan.suscripcion_tipo === 'pro') return true
  if (plan.suscripcion_tipo !== 'trial' || !plan.trial_hasta) return false
  const expiresAt = new Date(plan.trial_hasta)
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() >= now.getTime()
}
