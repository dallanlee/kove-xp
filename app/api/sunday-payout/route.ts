import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runSundayPayout } from '@/lib/payout'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { xp_to_dollars, xp_to_screen_time }: { xp_to_dollars: number; xp_to_screen_time: number } = body

  if (xp_to_dollars === undefined || xp_to_screen_time === undefined) {
    return NextResponse.json({ error: 'Missing xp_to_dollars or xp_to_screen_time' }, { status: 400 })
  }

  const summary = await runSundayPayout(supabase, xp_to_dollars, xp_to_screen_time)

  return NextResponse.json({ success: true, payout: summary })
}
