import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type Database } from '@/types/database.types';
import { env } from '@/lib/env';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // This error is often benign and can be ignored, especially in Server Components
          // where the `set` method might be called after headers have been sent.
          // You can add more specific error handling here if needed.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Similar to `set`, this can sometimes be ignored in Server Components.
        }
      },
    },
  });
}
