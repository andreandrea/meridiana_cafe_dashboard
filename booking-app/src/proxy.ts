import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Protegge /admin/**: senza sessione Supabase valida, redirect a
 * /admin/login. Nota: questo è un primo filtro, non l'unica difesa —
 * ogni Server Action/Route Handler che tocca dati admin deve
 * comunque verificare la sessione autonomamente (vedi lib/supabase/server.ts).
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/admin/login'
  // La sessione di recovery arriva via hash fragment, gestito lato
  // client: al primo request server-side non c'è ancora nessuna
  // sessione/cookie, quindi questa pagina va esclusa dal guard.
  const isResetPasswordPage = request.nextUrl.pathname === '/admin/reset-password'

  if (!user && !isLoginPage && !isResetPasswordPage) {
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/admin/richieste', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
