import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import TaskList from '@/components/TaskList'
import XPBar from '@/components/XPBar'
import StreakCounter from '@/components/StreakCounter'
import type { Task } from '@/types/database'

export const dynamic = 'force-dynamic'

const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  bedtime: 'Bedtime',
  health: 'Health',
}

const PERIOD_ORDER = ['morning', 'afternoon', 'bedtime', 'health']

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const friendlyDate = format(new Date(today + 'T12:00:00'), 'EEEE, MMM d')

  // Fetch all daily tasks (not weekly or bonus — those are on /weekly)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .in('period', ['morning', 'afternoon', 'bedtime', 'health'])
    .order('sort_order')

  // Fetch today's completions
  const { data: completions } = await supabase
    .from('daily_completions')
    .select('task_id')
    .eq('completed_date', today)

  // Fetch family row
  const { data: family } = await supabase
    .from('families')
    .select('current_streak, xp_balance')
    .single()

  // Fetch today's XP total
  const { data: xpEvents } = await supabase
    .from('xp_events')
    .select('xp_delta')
    .eq('event_date', today)

  const todayXp = (xpEvents || []).reduce((sum: number, e: { xp_delta: number }) => sum + e.xp_delta, 0)
  const completedTaskIds = (completions || []).map((c: { task_id: string }) => c.task_id)

  // Group tasks by period
  const tasksByPeriod: Record<string, Task[]> = {}
  for (const task of (tasks || []) as Task[]) {
    if (!tasksByPeriod[task.period]) tasksByPeriod[task.period] = []
    tasksByPeriod[task.period].push(task)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-300">
          ⚡ {friendlyDate}
        </h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Today's XP */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Today's XP</div>
          <div className="text-3xl font-bold text-yellow-400">
            {todayXp.toLocaleString()}
          </div>
          <div className="text-xs text-yellow-600">XP earned</div>
        </div>

        {/* Streak */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center justify-center">
          <StreakCounter streak={family?.current_streak ?? 0} />
        </div>
      </div>

      {/* XP Progress bar */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
        <XPBar currentXp={todayXp} />
      </div>

      {/* Task sections by period */}
      {PERIOD_ORDER.map(period => {
        const periodTasks = tasksByPeriod[period]
        if (!periodTasks || periodTasks.length === 0) return null

        const doneCount = periodTasks.filter(t => completedTaskIds.includes(t.id)).length
        const allDone = doneCount === periodTasks.length

        return (
          <div key={period} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {PERIOD_LABELS[period] ?? period}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                allDone
                  ? 'bg-green-900/50 text-green-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {doneCount}/{periodTasks.length}
              </span>
            </div>
            <TaskList
              tasks={periodTasks}
              completedTaskIds={completedTaskIds}
              date={today}
            />
          </div>
        )
      })}

      {/* Padding for bottom nav */}
      <div className="h-4" />
    </div>
  )
}
