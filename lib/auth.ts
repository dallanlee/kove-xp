import { redirect } from 'react-router'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireAuth(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect('/login')
  return { supabase, headers, user }
}

export async function requireParent(request: Request) {
  const { supabase, headers, user } = await requireAuth(request)
  const role = (user.user_metadata?.role as string) ?? 'kove'
  if (role !== 'parent') throw redirect('/')
  return { supabase, headers }
}

export function getRole(user: { user_metadata?: Record<string, unknown> } | null): 'parent' | 'kove' {
  return ((user?.user_metadata?.role as string) === 'parent') ? 'parent' : 'kove'
}
