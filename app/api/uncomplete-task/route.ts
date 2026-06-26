import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { task_id, date }: { task_id: string; date: string } = body

  if (!task_id || !date) {
    return NextResponse.json({ error: 'Missing task_id or date' }, { status: 400 })
  }

  // Delete daily completion
  const { error: completionError } = await supabase
    .from('daily_completions')
    .delete()
    .eq('task_id', task_id)
    .eq('completed_date', date)

  if (completionError) {
    return NextResponse.json({ error: completionError.message }, { status: 500 })
  }

  // Delete corresponding xp_event for that task on that date
  const { error: xpError } = await supabase
    .from('xp_events')
    .delete()
    .eq('event_type', 'task')
    .eq('event_date', date)
    .eq('task_id', task_id)

  if (xpError) {
    return NextResponse.json({ error: xpError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
