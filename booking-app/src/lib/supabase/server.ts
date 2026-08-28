import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Client con sessione utente (anon key + cookies). Usato SOLO per
 * verificare/leggere la sessione staff (Supabase Auth) in Server
 * Actions, Route Handler e proxy.ts. Non usarlo per leggere/scrivere
 * dati di dominio: RLS è deny-by-default su tutte le tabelle.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // set() chiamato da un Server Component: ignorabile se il
            // refresh della sessione è gestito da proxy.ts.
          }
        },
      },
    }
  )
}

/**
 * Client con service role key: bypassa la RLS. Unico modo per
 * leggere/scrivere le tabelle di dominio (bookings, tables, menu,
 * settings...). Va usato SOLO in codice server-side (Route Handler,
 * Server Action) e MAI esposto al browser. Ogni chiamata che scrive
 * dati sensibili all'admin deve prima verificare la sessione staff
 * con createSupabaseServerClient().
 */
export function createSupabaseServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
