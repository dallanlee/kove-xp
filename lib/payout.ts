import type { SupabaseClient } from '@supabase/supabase-js'
import { getFamily } from './xp'
import { getTasks, getDailyCompletions, getWeeklyCompletions } from './tasks'
import { getMostRecentMondayMT, addDaysToDate } from './date'

export interface PayoutSummary {
  weekStart: string
  grossXp: number
  perfectWeekBonus: number
  totalXp: number
  xpToDollars: number
  xpToScreenTime: number
  dollarsEarned: number
  screenTimeEarnedMinutes: number
  interestEarned: number
  newDollarBalance: number
  newScreenTimeBalance: number
  xpCarriedForward: number
}

export async function runSundayPayout(
  supabase: SupabaseClient,
  xpToDollarsInput: number,
  xpToScreenTimeInput: number
): Promise<PayoutSummary> {
  // 1. Calculate weekStart in Mountain Time
  const weekStart = getMostRecentMondayMT()
  const weekEnd = addDaysToDate(weekStart, 6) // Sunday

  // 2. Sum gross XP for the week (exclude payout_conversion)
  const { data: events, error: eventsError } = await supabase
    .from('xp_events')
    .select('xp_delta, event_type')
    .gte('event_date', weekStart)
    .lte('event_date', weekEnd)
    .neq('event_type', 'payout_conversion')

  if (eventsError) throw eventsError
  const grossXp = (events as { xp_delta: number; event_type: string }[]).reduce(
    (sum, e) => sum + e.xp_delta,
    0
  )

  // 3. Check perfect week
  let perfectWeekBonus = 0
  const allDailyTasks = await getTasks(supabase)
  const mandatoryPeriods = ['morning', 'afternoon', 'bedtime']
  const mandatoryTaskIds = allDailyTasks
    .filter(t => mandatoryPeriods.includes(t.period))
    .map(t => t.id)

  const weeklyTaskIds = allDailyTasks
    .filter(t => t.period === 'weekly')
    .map(t => t.id)

  // Check each day of the week
  let allDaysComplete = true
  for (let i = 0; i < 7; i++) {
    const dayDate = addDaysToDate(weekStart, i)
    const completions = await getDailyCompletions(supabase, dayDate)
    const completedIds = completions.map(c => c.task_id)
    const dayComplete = mandatoryTaskIds.every(id => completedIds.includes(id))
    if (!dayComplete) { allDaysComplete = false; break }
  }

  // Check weekly tasks
  const weeklyCompletions = await getWeeklyCompletions(supabase, weekStart)
  const completedWeeklyIds = weeklyCompletions.map(c => c.task_id)
  const allWeeklyDone = weeklyTaskIds.every(id => completedWeeklyIds.includes(id))

  if (allDaysComplete && allWeeklyDone) {
    perfectWeekBonus = 1000
    const { error: bonusError } = await supabase.from('xp_events').insert({
      xp_delta: 1000,
      reason: 'Perfect week — every task completed all 7 days!',
      event_type: 'perfect_week',
      task_id: null,
      event_date: weekEnd,
      actor: 'kove',
    })
    if (bonusError) throw bonusError
  }

  const totalXp = grossXp + perfectWeekBonus

  // 4. Calculate earnings
  const dollarsEarned = Math.floor(xpToDollarsInput / 1000)
  const screenTimeEarned = Math.floor(xpToScreenTimeInput / 1000) * 30

  // 5. Fetch family
  const family = await getFamily(supabase)

  // 6. Interest
  const interestEarned = Math.round(family.dollar_balance * 0.10 * 100) / 100

  // 7. XP carried forward
  const xpCarriedForward = totalXp - xpToDollarsInput - xpToScreenTimeInput +
    (xpToDollarsInput % 1000) + (xpToScreenTimeInput % 1000)

  const newDollarBalance = Number((family.dollar_balance + dollarsEarned + interestEarned).toFixed(2))
  const newScreenTimeBalance = family.screen_time_minutes + screenTimeEarned
  const newXpBalance = xpCarriedForward + (family.xp_balance || 0)

  // 8. Update family
  const { error: updateError } = await supabase
    .from('families')
    .update({
      dollar_balance: newDollarBalance,
      screen_time_minutes: newScreenTimeBalance,
      xp_balance: newXpBalance,
    })
    .eq('id', family.id)

  if (updateError) throw updateError

  // 9. Insert payout record
  const { error: payoutError } = await supabase.from('payouts').insert({
    week_start: weekStart,
    gross_xp: grossXp,
    streak_bonus_xp: 0,
    perfect_day_bonus_xp: 0,
    perfect_week_bonus_xp: perfectWeekBonus,
    total_xp: totalXp,
    xp_to_dollars: xpToDollarsInput,
    xp_to_screen_time: xpToScreenTimeInput,
    dollars_earned: dollarsEarned,
    screen_time_earned_minutes: screenTimeEarned,
    interest_earned: interestEarned,
    new_dollar_balance: newDollarBalance,
    new_screen_time_balance: newScreenTimeBalance,
    xp_carried_forward: xpCarriedForward,
  })

  if (payoutError) throw payoutError

  // 10. Delete weekly_completions for this weekStart (reset for next week)
  const { error: deleteError } = await supabase
    .from('weekly_completions')
    .delete()
    .eq('week_start', weekStart)

  if (deleteError) throw deleteError

  return {
    weekStart,
    grossXp,
    perfectWeekBonus,
    totalXp,
    xpToDollars: xpToDollarsInput,
    xpToScreenTime: xpToScreenTimeInput,
    dollarsEarned,
    screenTimeEarnedMinutes: screenTimeEarned,
    interestEarned,
    newDollarBalance,
    newScreenTimeBalance,
    xpCarriedForward,
  }
}
