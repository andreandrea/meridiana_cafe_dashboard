import { createBrowserClient } from '@supabase/ssr'

/**
 * Client browser (anon key). Usato solo dalle pagine /admin/login per
 * il flusso di autenticazione staff via Supabase Auth.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
