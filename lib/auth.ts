import { redirect } from 'react-router'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireAuth(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect('/login')
  return { supabase, headers }
}
