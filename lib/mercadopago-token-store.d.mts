import type { SupabaseClient } from '@supabase/supabase-js'

export function persistBusinessToken(
  admin: SupabaseClient,
  negocioId: string,
  payload: Record<string, unknown>,
): Promise<void>
