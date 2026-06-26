import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { offense, xp_delta }: { offense: string; xp_delta: number } = body

  if (!offense || xp_delta === undefined) {
    return NextResponse.json({ error: 'Missing offense or xp_delta' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('xp_events').insert({
    xp_delta: xp_delta < 0 ? xp_delta : -Math.abs(xp_delta),
    reason: offense,
    event_type: 'penalty',
    task_id: null,
    event_date: today,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
