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

  const { data: task } = await supabase
    .from('tasks')
    .select('xp, name')
    .eq('id', task_id)
    .single()

  const { error } = await supabase
    .from('weekly_completions')
    .upsert({ task_id, week_start }, { onConflict: 'task_id,week_start', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Award XP for the weekly task
  if (task) {
    const { data: existingEvent } = await supabase
      .from('xp_events')
      .select('id')
      .eq('event_type', 'task')
      .eq('task_id', task_id)
      .gte('event_date', week_start)
      .limit(1)

    if (!existingEvent || existingEvent.length === 0) {
      await supabase.from('xp_events').insert({
        xp_delta: task.xp,
        reason: task.name,
        event_type: 'task',
        task_id,
        event_date: week_start,
      })
    }
  }

  return NextResponse.json({ success: true })
}
