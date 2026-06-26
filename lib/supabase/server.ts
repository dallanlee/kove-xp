import { createServerClient } from '@supabase/ssr'

function parseCookies(header: string): { name: string; value: string }[] {
  if (!header) return []
  return header.split(';').map(c => {
    const idx = c.indexOf('=')
    if (idx === -1) return null
    return { name: c.slice(0, idx).trim(), value: c.slice(idx + 1) }
  }).filter(Boolean) as { name: string; value: string }[]
}

function serializeCookie(
  name: string,
  value: string,
  options: Record<string, unknown> = {}
): string {
  let cookie = `${name}=${encodeURIComponent(value)}`
  if (options['maxAge']) cookie += `; Max-Age=${options['maxAge']}`
  if (options['expires']) cookie += `; Expires=${(options['expires'] as Date).toUTCString()}`
  if (options['path']) cookie += `; Path=${options['path']}`
  if (options['domain']) cookie += `; Domain=${options['domain']}`
  if (options['secure']) cookie += '; Secure'
  if (options['httpOnly']) cookie += '; HttpOnly'
  if (options['sameSite']) cookie += `; SameSite=${options['sameSite']}`
  return cookie
}

export function createSupabaseServerClient(request: Request) {
  const cookieEntries = parseCookies(request.headers.get('Cookie') ?? '')
  const responseHeaders = new Headers()

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieEntries
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseHeaders.append(
              'Set-Cookie',
              serializeCookie(name, value, options as Record<string, unknown>)
            )
          })
        },
      },
    }
  )

  return { supabase, headers: responseHeaders }
}
