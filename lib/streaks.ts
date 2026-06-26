import type { SupabaseClient } from '@supabase/supabase-js'
import { getMorningTaskIds, getDailyCompletions, getAllMandatoryTaskIds } from './tasks'
import { getFamily } from './xp'

const STREAK_MILESTONES: Record<number, number> = {
  3: 150,
  7: 500,
  14: 1500,
}

function yesterday(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export async function updateStreakAfterMorningCompletion(
  supabase: SupabaseClient,
  date: string
): Promise<{ newStreak: number; milestoneBonus: number | null }> {
  // 1. Get all morning task IDs
  const morningTaskIds = await getMorningTaskIds(supabase)

  // 2. Get daily completions for date
  const completions = await getDailyCompletions(supabase, date)
  const completedTaskIds = completions.map(c => c.task_id)

  // 3. Check if all morning tasks are done
  const allMorningDone = morningTaskIds.every(id => completedTaskIds.includes(id))
  if (!allMorningDone) {
    const family = await getFamily(supabase)
    return { newStreak: family.current_streak, milestoneBonus: null }
  }

  // 4. Fetch family row
  const family = await getFamily(supabase)

  // 5. Check if last_streak_date is yesterday
  const yesterdayStr = yesterday(date)
  const isConsecutive = family.last_streak_date === yesterdayStr

  // 6. Calculate new streak
  const newStreak = isConsecutive ? family.current_streak + 1 : 1

  // 7. Update family streak fields
  const newLongest = Math.max(newStreak, family.longest_streak)
  const { error: updateError } = await supabase
    .from('families')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_streak_date: date,
    })
    .eq('id', family.id)

  if (updateError) throw updateError

  // 8. Check milestones
  let milestoneBonus: number | null = null
  if (STREAK_MILESTONES[newStreak]) {
    milestoneBonus = STREAK_MILESTONES[newStreak]
    const { error: eventError } = await supabase.from('xp_events').insert({
      xp_delta: milestoneBonus,
      reason: `${newStreak}-day streak bonus!`,
      event_type: 'streak_bonus',
      task_id: null,
      event_date: date,
    })
    if (eventError) throw eventError
  }

  return { newStreak, milestoneBonus }
}

export async function checkPerfectDay(
  supabase: SupabaseClient,
  date: string
): Promise<boolean> {
  // 1. Get all mandatory task IDs
  const mandatoryIds = await getAllMandatoryTaskIds(supabase)

  // 2. Get daily completions for date
  const completions = await getDailyCompletions(supabase, date)
  const completedIds = completions.map(c => c.task_id)

  // 3. Check if all mandatory tasks are complete
  const allDone = mandatoryIds.every(id => completedIds.includes(id))
  if (!allDone) return false

  // Check if perfect day bonus already awarded today
  const { data: existing } = await supabase
    .from('xp_events')
    .select('id')
    .eq('event_type', 'perfect_day')
    .eq('event_date', date)
    .limit(1)

  if (existing && existing.length > 0) return true // already awarded

  // 4. Insert perfect day xp_event
  const { error } = await supabase.from('xp_events').insert({
    xp_delta: 100,
    reason: 'Perfect day — all morning, afternoon & bedtime tasks complete!',
    event_type: 'perfect_day',
    task_id: null,
    event_date: date,
  })
  if (error) throw error

  return true
}
