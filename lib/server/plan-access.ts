import 'server-only'
import type { createAdminClient } from './supabase'

export async function hasProAccess(admin: ReturnType<typeof createAdminClient>, business: string): Promise<boolean> {
  const { data, error } = await admin.rpc('turnly_commercial_advanced', { business })
  return !error && data === true
}
