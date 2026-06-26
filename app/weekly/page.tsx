import { createClient } from '@/lib/supabase/server'
import { format, startOfWeek, addDays } from 'date-fns'
import StreakCounter from '@/components/StreakCounter'
import WeeklyTaskList from './WeeklyTaskList'
import type { Task } from '@/types/database'

export const dynamic = 'force-dynamic'

const MILESTONES = [3, 7, 14]

export default async function WeeklyPage() {
  const supabase = await createClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Most recent Monday
  const monday = startOfWeek(today, { weekStartsOn: 1 })
  const weekStart = monday.toISOString().split('T')[0]

  // Fetch weekly tasks
  const { data: weeklyTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .eq('period', 'weekly')
    .order('sort_order')

  // Fetch weekly completions for this week
  const { data: weeklyCompletions } = await supabase
    .from('weekly_completions')
    .select('task_id')
    .eq('week_start', weekStart)

  // Fetch family for streak
  const { data: family } = await supabase
    .from('families')
    .select('current_streak, longest_streak, xp_balance')
    .single()

  // Fetch week's XP total
  const sunday = addDays(monday, 6)
  const sundayStr = sunday.toISOString().split('T')[0]

  const { data: weekXpEvents } = await supabase
    .from('xp_events')
    .select('xp_delta')
    .gte('event_date', weekStart)
    .lte('event_date', sundayStr)
    .neq('event_type', 'payout_conversion')

  const weekXp = (weekXpEvents || []).reduce((sum: number, e: { xp_delta: number }) => sum + e.xp_delta, 0)

  // Get morning task IDs once
  const { data: morningTasksData } = await supabase
    .from('tasks')
    .select('id')
    .eq('is_active', true)
    .eq('period', 'morning')

  const morningTaskIds = (morningTasksData || []).map((t: { id: string }) => t.id)

  // Check each day's morning routine completion
  const morningDays: { date: string; label: string; done: boolean }[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(monday, i)
    const dateStr = day.toISOString().split('T')[0]
    const label = format(day, 'EEE')

    const { data: dayCompletions } = await supabase
      .from('daily_completions')
      .select('task_id')
      .eq('completed_date', dateStr)
      .in('task_id', morningTaskIds.length > 0 ? morningTaskIds : ['none'])

    const completedMorningIds = (dayCompletions || []).map((c: { task_id: string }) => c.task_id)
    const allDone = morningTaskIds.length > 0 &&
      morningTaskIds.every((id: string) => completedMorningIds.includes(id))

    morningDays.push({ date: dateStr, label, done: allDone })
  }

  const completedWeeklyTaskIds = (weeklyCompletions || []).map((c: { task_id: string }) => c.task_id)
  const currentStreak = family?.current_streak ?? 0
  const nextMilestone = MILESTONES.find(m => m > currentStreak)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-300 mb-6">🔥 Weekly View</h1>

      {/* Streak + Week XP */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center justify-center">
          <StreakCounter streak={currentStreak} />
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">This Week</div>
          <div className="text-3xl font-bold text-yellow-400">{weekXp.toLocaleString()}</div>
          <div className="text-xs text-yellow-600">XP total</div>
        </div>
      </div>

      {/* Streak milestone progress */}
      {nextMilestone && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
          <div className="text-xs text-slate-400 mb-2">Streak Progress to {nextMilestone}-day bonus</div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all"
              style={{ width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-orange-400">{currentStreak} days</span>
            <span className="text-slate-400">{nextMilestone} days</span>
          </div>
          <div className="text-xs text-center text-orange-300 mt-1">
            Milestone badges: 🥉 3 days (+150 XP) · 🥈 7 days (+500 XP) · 🥇 14 days (+1500 XP)
          </div>
        </div>
      )}

      {/* Days of the week */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
        <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Morning Routine This Week</div>
        <div className="grid grid-cols-7 gap-1">
          {morningDays.map(({ date, label, done }) => {
            const isToday = date === todayStr
            const isFuture = date > todayStr
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className={`text-xs ${isToday ? 'text-yellow-400 font-bold' : 'text-slate-500'}`}>
                  {label}
                </span>
                <span className="text-lg">
                  {isFuture ? '⬜' : done ? '✅' : '❌'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weekly tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Weekly Tasks</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">
            {completedWeeklyTaskIds.length}/{(weeklyTasks || []).length}
          </span>
        </div>
        {weeklyTasks && weeklyTasks.length > 0 ? (
          <WeeklyTaskList
            tasks={weeklyTasks as Task[]}
            completedTaskIds={completedWeeklyTaskIds}
            weekStart={weekStart}
          />
        ) : (
          <p className="text-slate-500 text-sm">No weekly tasks found.</p>
        )}
      </div>
    </div>
  )
}
