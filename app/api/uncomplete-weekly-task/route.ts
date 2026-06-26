import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id, week_start } = await request.json()
  if (!task_id || !week_start) {
    return NextResponse.json({ error: 'Missing task_id or week_start' }, { status: 400 })
  }

  const { error } = await supabase
    .from('weekly_completions')
    .delete()
    .eq('task_id', task_id)
    .eq('week_start', week_start)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove the XP event for this weekly task
  await supabase
    .from('xp_events')
    .delete()
    .eq('event_type', 'task')
    .eq('task_id', task_id)
    .gte('event_date', week_start)

  return NextResponse.json({ success: true })
}
