import { data, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireAuth } from '@/lib/auth'
import { getTodayMT, getMostRecentMondayMT, addDaysToDate, formatFriendlyDate } from '@/lib/date'
import StreakCounter from '@/components/StreakCounter'
import type { Task } from '@/types/database'

const MILESTONES = [3, 7, 14]

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  const today = getTodayMT()
  const weekStart = getMostRecentMondayMT()

  const [
    { data: weeklyTasks },
    { data: weeklyCompletions },
    { data: family },
    { data: morningTasksData },
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('is_active', true).eq('period', 'weekly').order('sort_order'),
    supabase.from('weekly_completions').select('task_id').eq('week_start', weekStart),
    supabase.from('families').select('current_streak, longest_streak, xp_balance').single(),
    supabase.from('tasks').select('id').eq('is_active', true).eq('period', 'morning'),
  ])

  const weekEnd = addDaysToDate(weekStart, 6)
  const { data: weekXpEvents } = await supabase.from('xp_events').select('xp_delta')
    .gte('event_date', weekStart).lte('event_date', weekEnd).neq('event_type', 'payout_conversion')
  const weekPts = (weekXpEvents || []).reduce((sum: number, e: { xp_delta: number }) => sum + e.xp_delta, 0)

  const morningTaskIds = (morningTasksData || []).map((t: { id: string }) => t.id)

  const morningDays: { date: string; label: string; done: boolean }[] = []
  for (let i = 0; i < 7; i++) {
    const dayStr = addDaysToDate(weekStart, i)
    const [year, month, day] = dayStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })

    if (morningTaskIds.length > 0) {
      const { data: dayCompletions } = await supabase.from('daily_completions')
        .select('task_id').eq('completed_date', dayStr).in('task_id', morningTaskIds)
      const completedIds = (dayCompletions || []).map((c: { task_id: string }) => c.task_id)
      const allDone = morningTaskIds.every((id: string) => completedIds.includes(id))
      morningDays.push({ date: dayStr, label, done: allDone })
    } else {
      morningDays.push({ date: dayStr, label, done: false })
    }
  }

  const completedWeeklyTaskIds = (weeklyCompletions || []).map((c: { task_id: string }) => c.task_id)

  return data({
    weeklyTasks: (weeklyTasks || []) as Task[],
    completedWeeklyTaskIds,
    family,
    weekPts,
    weekStart,
    today,
    morningDays,
  }, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const task_id = formData.get('task_id') as string
  const week_start = formData.get('week_start') as string

  if (!task_id || !week_start) return data({ error: 'Missing params' }, { status: 400, headers })

  if (intent === 'complete-weekly') {
    const { data: task } = await supabase.from('tasks').select('xp, name').eq('id', task_id).single()
    await supabase.from('weekly_completions').upsert(
      { task_id, week_start },
      { onConflict: 'task_id,week_start', ignoreDuplicates: true }
    )
    if (task) {
      const { data: existing } = await supabase.from('xp_events').select('id')
        .eq('event_type', 'task').eq('task_id', task_id).gte('event_date', week_start).limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from('xp_events').insert({
          xp_delta: task.xp,
          reason: task.name,
          event_type: 'task',
          task_id,
          event_date: week_start,
          actor: 'kove',
        })
      }
    }
  } else if (intent === 'uncomplete-weekly') {
    await supabase.from('weekly_completions').delete().eq('task_id', task_id).eq('week_start', week_start)
    await supabase.from('xp_events').delete()
      .eq('event_type', 'task').eq('task_id', task_id).gte('event_date', week_start)
  }

  return data({ success: true }, { headers })
}

function WeeklyTaskItem({ task, done, weekStart }: { task: Task; done: boolean; weekStart: string }) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== 'idle'
  const optimisticDone = isSubmitting ? !done : done

  return (
    <li>
      <fetcher.Form method="post">
        <input type="hidden" name="task_id" value={task.id} />
        <input type="hidden" name="week_start" value={weekStart} />
        <input type="hidden" name="intent" value={done ? 'uncomplete-weekly' : 'complete-weekly'} />
        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
            optimisticDone
              ? 'bg-green-900/30 border-green-700 opacity-80'
              : 'bg-slate-800 border-slate-700 hover:border-slate-500 active:scale-[0.99]',
            isSubmitting ? 'opacity-60 cursor-wait' : 'cursor-pointer',
          ].join(' ')}
        >
          <div className={[
            'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
            optimisticDone ? 'bg-green-400 border-green-400' : 'border-slate-500 bg-transparent',
          ].join(' ')}>
            {optimisticDone && <span className="text-slate-900 text-sm font-bold">✓</span>}
          </div>
          <span className={`flex-1 text-left text-sm font-medium ${optimisticDone ? 'line-through text-slate-500' : 'text-white'}`}>
            {task.name}
          </span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            optimisticDone ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
          }`}>
            +{task.xp} pts
          </span>
        </button>
      </fetcher.Form>
    </li>
  )
}

export default function WeeklyPage() {
  const { weeklyTasks, completedWeeklyTaskIds, family, weekPts, weekStart, today, morningDays } =
    useLoaderData<typeof loader>()

  const currentStreak = family?.current_streak ?? 0
  const nextMilestone = MILESTONES.find(m => m > currentStreak)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-300 mb-6">🔥 Weekly View</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center justify-center">
          <StreakCounter streak={currentStreak} />
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">This Week</div>
          <div className="text-3xl font-bold text-blue-400">{weekPts.toLocaleString()}</div>
          <div className="text-xs text-blue-600">pts total</div>
        </div>
      </div>

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
            Badges: 🥉 3 days (+150 pts) · 🥈 7 days (+500 pts) · 🥇 14 days (+1500 pts)
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
        <div className="text-xs text-slate-400 mb-3 uppercase tracking-wider">Morning Routine This Week</div>
        <div className="grid grid-cols-7 gap-1">
          {morningDays.map(({ date, label, done }) => {
            const isToday = date === today
            const isFuture = date > today
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <span className={`text-xs ${isToday ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
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

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Weekly Tasks</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">
            {completedWeeklyTaskIds.length}/{weeklyTasks.length}
          </span>
        </div>
        {weeklyTasks.length > 0 ? (
          <ul className="space-y-2">
            {weeklyTasks.map(task => (
              <WeeklyTaskItem
                key={task.id}
                task={task}
                done={completedWeeklyTaskIds.includes(task.id)}
                weekStart={weekStart}
              />
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">No weekly tasks found.</p>
        )}
      </div>
    </div>
  )
}
