import type { SupabaseClient } from '@supabase/supabase-js'
import { getMorningTaskIds, getDailyCompletions, getAllMandatoryTaskIds } from './tasks'
import { getFamily } from './xp'

const STREAK_MILESTONES: Record<number, number> = {
  3: 150,
  7: 500,
  14: 1500,
}

function yesterday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function updateStreakAfterMorningCompletion(
  supabase: SupabaseClient,
  date: string
): Promise<{ newStreak: number; milestoneBonus: number | null }> {
  const morningTaskIds = await getMorningTaskIds(supabase)
  const completions = await getDailyCompletions(supabase, date)
  const completedTaskIds = completions.map(c => c.task_id)

  const allMorningDone = morningTaskIds.every(id => completedTaskIds.includes(id))
  if (!allMorningDone) {
    const family = await getFamily(supabase)
    return { newStreak: family.current_streak, milestoneBonus: null }
  }

  const family = await getFamily(supabase)

  // Idempotent: if streak already recorded for today, don't increment again
  if (family.last_streak_date === date) {
    return { newStreak: family.current_streak, milestoneBonus: null }
  }

  const yesterdayStr = yesterday(date)
  const isConsecutive = family.last_streak_date === yesterdayStr
  const newStreak = isConsecutive ? family.current_streak + 1 : 1
  const newLongest = Math.max(newStreak, family.longest_streak)

  const { error: updateError } = await supabase
    .from('families')
    .update({ current_streak: newStreak, longest_streak: newLongest, last_streak_date: date })
    .eq('id', family.id)
  if (updateError) throw updateError

  let milestoneBonus: number | null = null
  if (STREAK_MILESTONES[newStreak]) {
    // Only award milestone if not already awarded today
    const { data: existing } = await supabase
      .from('xp_events')
      .select('id')
      .eq('event_type', 'streak_bonus')
      .eq('event_date', date)
      .limit(1)

    if (!existing || existing.length === 0) {
      milestoneBonus = STREAK_MILESTONES[newStreak]
      const { error: eventError } = await supabase.from('xp_events').insert({
        xp_delta: milestoneBonus,
        reason: `${newStreak}-day streak bonus!`,
        event_type: 'streak_bonus',
        task_id: null,
        event_date: date,
        actor: 'kove',
      })
      if (eventError) throw eventError
    }
  }

  return { newStreak, milestoneBonus }
}

/** Called after uncompleting a morning task. Reverts streak if morning is no longer fully done. */
export async function revokeStreakIfMorningIncomplete(
  supabase: SupabaseClient,
  date: string
): Promise<void> {
  const morningTaskIds = await getMorningTaskIds(supabase)
  const completions = await getDailyCompletions(supabase, date)
  const completedIds = completions.map(c => c.task_id)

  // Morning still complete — nothing to revoke
  if (morningTaskIds.every(id => completedIds.includes(id))) return

  const family = await getFamily(supabase)

  // Only revert if today was the active streak date
  if (family.last_streak_date !== date) return

  // Was yesterday's morning complete? Determines what the pre-today streak was.
  const yesterdayStr = yesterday(date)
  const yesterdayCompletions = await getDailyCompletions(supabase, yesterdayStr)
  const yesterdayIds = yesterdayCompletions.map(c => c.task_id)
  const yesterdayMorningComplete = morningTaskIds.every(id => yesterdayIds.includes(id))

  const previousStreak = yesterdayMorningComplete ? family.current_streak - 1 : 0
  const previousLastDate = yesterdayMorningComplete ? yesterdayStr : null

  await supabase
    .from('families')
    .update({ current_streak: previousStreak, last_streak_date: previousLastDate })
    .eq('id', family.id)

  // Remove any streak bonus awarded on this date (milestone that no longer applies)
  await supabase
    .from('xp_events')
    .delete()
    .eq('event_type', 'streak_bonus')
    .eq('event_date', date)
}

export async function checkPerfectDay(
  supabase: SupabaseClient,
  date: string
): Promise<boolean> {
  const mandatoryIds = await getAllMandatoryTaskIds(supabase)
  const completions = await getDailyCompletions(supabase, date)
  const completedIds = completions.map(c => c.task_id)

  const allDone = mandatoryIds.every(id => completedIds.includes(id))
  if (!allDone) return false

  const { data: existing } = await supabase
    .from('xp_events')
    .select('id')
    .eq('event_type', 'perfect_day')
    .eq('event_date', date)
    .limit(1)

  if (existing && existing.length > 0) return true

  const { error } = await supabase.from('xp_events').insert({
    xp_delta: 100,
    reason: 'Perfect day — all morning, afternoon & bedtime tasks complete!',
    event_type: 'perfect_day',
    task_id: null,
    event_date: date,
    actor: 'kove',
  })
  if (error) throw error

  return true
}

/** Called after uncompleting any task. Removes the perfect day bonus if the day is no longer perfect. */
export async function revokePerfectDayIfNeeded(
  supabase: SupabaseClient,
  date: string
): Promise<void> {
  const mandatoryIds = await getAllMandatoryTaskIds(supabase)
  const completions = await getDailyCompletions(supabase, date)
  const completedIds = completions.map(c => c.task_id)

  // Day is still perfect — nothing to revoke
  if (mandatoryIds.every(id => completedIds.includes(id))) return

  await supabase
    .from('xp_events')
    .delete()
    .eq('event_type', 'perfect_day')
    .eq('event_date', date)
}
