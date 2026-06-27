import { data, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireAuth } from '@/lib/auth'
import { getTodayMT, formatFriendlyDate } from '@/lib/date'
import { updateStreakAfterMorningCompletion, checkPerfectDay } from '@/lib/streaks'
import PointsBar from '@/components/PointsBar'
import StreakCounter from '@/components/StreakCounter'
import type { Task, XpEvent } from '@/types/database'

const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  bedtime: 'Bedtime',
  health: 'Health',
}
const PERIOD_ORDER = ['morning', 'afternoon', 'bedtime', 'health']

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  const today = getTodayMT()

  const [
    { data: tasks },
    { data: completions },
    { data: family },
    { data: xpEvents },
  ] = await Promise.all([
    supabase.from('tasks').select('*').eq('is_active', true)
      .in('period', ['morning', 'afternoon', 'bedtime', 'health']).order('sort_order'),
    supabase.from('daily_completions').select('task_id').eq('completed_date', today),
    supabase.from('families').select('current_streak, xp_balance').single(),
    supabase.from('xp_events').select('*').eq('event_date', today).order('created_at'),
  ])

const todayPts = (xpEvents || []).reduce((sum: number, e: { xp_delta: number }) => sum + e.xp_delta, 0)
  const completedTaskIds = (completions || []).map((c: { task_id: string }) => c.task_id)

  return data({ tasks: (tasks || []) as Task[], completedTaskIds, family, todayPts, today, xpEvents: (xpEvents || []) as XpEvent[] }, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const task_id = formData.get('task_id') as string
  const date = formData.get('date') as string

  if (!task_id || !date) return data({ error: 'Missing task_id or date' }, { status: 400, headers })

  if (intent === 'complete') {
    const { data: task } = await supabase.from('tasks').select('*').eq('id', task_id).single()
    if (!task) return data({ error: 'Task not found' }, { status: 404, headers })

    await supabase.from('daily_completions').upsert(
      { task_id, completed_date: date },
      { onConflict: 'task_id,completed_date', ignoreDuplicates: true }
    )

    const { data: existing } = await supabase.from('xp_events').select('id')
      .eq('event_type', 'task').eq('event_date', date).eq('task_id', task_id).limit(1)

    if (!existing || existing.length === 0) {
      await supabase.from('xp_events').insert({
        xp_delta: task.xp,
        reason: task.name,
        event_type: 'task',
        task_id,
        event_date: date,
        actor: 'kove',
      })
    }

    if (task.period === 'morning') {
      await updateStreakAfterMorningCompletion(supabase, date)
    }
    await checkPerfectDay(supabase, date)

  } else if (intent === 'uncomplete') {
    await supabase.from('daily_completions').delete()
      .eq('task_id', task_id).eq('completed_date', date)
    await supabase.from('xp_events').delete()
      .eq('event_type', 'task').eq('event_date', date).eq('task_id', task_id)
  }

  return data({ success: true }, { headers })
}

function TaskItem({ task, done, date }: { task: Task; done: boolean; date: string }) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== 'idle'
  // Optimistic: flip the visual state mid-flight
  const optimisticDone = isSubmitting ? !done : done

  return (
    <li>
      <fetcher.Form method="post">
        <input type="hidden" name="task_id" value={task.id} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="intent" value={done ? 'uncomplete' : 'complete'} />
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

function TodayLedger({ events, totalPts }: { events: XpEvent[]; totalPts: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-slate-700 pt-4 mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-white py-2"
      >
        <span>Today's Point Events ({events.length})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm">No events yet today.</p>
          ) : (
            events.map(event => (
              <div key={event.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
                <div>
                  <div className="text-sm text-white">{event.reason}</div>
                  <div className="text-xs text-slate-500">
                    {event.actor === 'parent' ? '🔒 Parent' : '⭐ Kove'} · {event.event_type.replace(/_/g, ' ')}
                  </div>
                </div>
                <span className={`text-sm font-bold ${event.xp_delta >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {event.xp_delta >= 0 ? '+' : ''}{event.xp_delta} pts
                </span>
              </div>
            ))
          )}
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-700">
            <span className="text-slate-400">Net today</span>
            <span className={totalPts >= 0 ? 'text-blue-400' : 'text-red-400'}>
              {totalPts >= 0 ? '+' : ''}{totalPts.toLocaleString()} pts
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { tasks, completedTaskIds, family, todayPts, today, xpEvents } = useLoaderData<typeof loader>()

  const tasksByPeriod: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!tasksByPeriod[task.period]) tasksByPeriod[task.period] = []
    tasksByPeriod[task.period].push(task)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-300">
          ⭐ {formatFriendlyDate(today)}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Today's Points</div>
          <div className="text-3xl font-bold text-blue-400">
            {todayPts.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600">pts earned</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center justify-center">
          <StreakCounter streak={family?.current_streak ?? 0} />
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
        <PointsBar currentPts={todayPts} />
      </div>

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
                allDone ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {doneCount}/{periodTasks.length}
              </span>
            </div>
            <ul className="space-y-2">
              {periodTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  done={completedTaskIds.includes(task.id)}
                  date={today}
                />
              ))}
            </ul>
          </div>
        )
      })}

      <TodayLedger events={xpEvents} totalPts={todayPts} />

      <div className="h-4" />
    </div>
  )
}
