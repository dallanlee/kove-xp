import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateStreakAfterMorningCompletion, checkPerfectDay } from '@/lib/streaks'

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

  // Fetch the task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', task_id)
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Insert daily completion (upsert — ignore if already exists)
  const { error: completionError } = await supabase
    .from('daily_completions')
    .upsert(
      { task_id, completed_date: date },
      { onConflict: 'task_id,completed_date', ignoreDuplicates: true }
    )

  if (completionError) {
    return NextResponse.json({ error: completionError.message }, { status: 500 })
  }

  // Check if xp event already exists for this task+date (avoid double XP on duplicate complete)
  const { data: existingEvent } = await supabase
    .from('xp_events')
    .select('id')
    .eq('event_type', 'task')
    .eq('event_date', date)
    .eq('task_id', task_id)
    .limit(1)

  if (!existingEvent || existingEvent.length === 0) {
    // Insert xp_event
    const { error: xpError } = await supabase.from('xp_events').insert({
      xp_delta: task.xp,
      reason: task.name,
      event_type: 'task',
      task_id,
      event_date: date,
    })

    if (xpError) {
      return NextResponse.json({ error: xpError.message }, { status: 500 })
    }
  }

  // Handle streak and perfect day if morning task
  let newStreak = 0
  const bonuses: string[] = []

  if (task.period === 'morning') {
    const streakResult = await updateStreakAfterMorningCompletion(supabase, date)
    newStreak = streakResult.newStreak
    if (streakResult.milestoneBonus) {
      bonuses.push(`${streakResult.newStreak}-day streak bonus: +${streakResult.milestoneBonus} XP`)
    }
  }

  const isPerfectDay = await checkPerfectDay(supabase, date)
  if (isPerfectDay) {
    bonuses.push('Perfect day bonus: +100 XP')
  }

  return NextResponse.json({
    success: true,
    xp_earned: task.xp,
    streak: newStreak,
    bonuses,
  })
}
