import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { reason, xp_delta }: { reason: string; xp_delta: number } = body

  if (!reason || xp_delta === undefined) {
    return NextResponse.json({ error: 'Missing reason or xp_delta' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('xp_events').insert({
    xp_delta: Math.abs(xp_delta),
    reason,
    event_type: 'bonus_award',
    task_id: null,
    event_date: today,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
