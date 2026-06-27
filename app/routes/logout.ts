import { redirect } from 'react-router'
import type { ActionFunctionArgs } from 'react-router'
import { requireAuth } from '@/lib/auth'

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  await supabase.auth.signOut()
  throw redirect('/login', { headers })
}
