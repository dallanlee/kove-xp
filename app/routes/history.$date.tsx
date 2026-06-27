import { useState } from 'react'
import { data, Link, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireAuth } from '@/lib/auth'
import { getTodayMT, formatFriendlyDate } from '@/lib/date'
import { updateStreakAfterMorningCompletion, checkPerfectDay, revokeStreakIfMorningIncomplete, revokePerfectDayIfNeeded } from '@/lib/streaks'
import type { Task, XpEvent } from '@/types/database'

const PERIOD_ORDER = ['morning', 'afternoon', 'bedtime', 'health']
const PERIOD_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  bedtime: 'Bedtime',
  health: 'Health',
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireAuth(request)
  const { date } = params

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Response('Invalid date', { status: 400 })
  }

  const today = getTodayMT()
  if (date > today) throw new Response('Cannot view future dates', { status: 400 })

  const [{ data: tasks }, { data: completions }, { data: xpEvents }] = await Promise.all([
    supabase
      .from('tasks').select('*')
      .eq('is_active', true)
      .in('period', ['morning', 'afternoon', 'bedtime', 'health'])
      .order('sort_order'),
    supabase
      .from('daily_completions').select('task_id')
      .eq('completed_date', date),
    supabase
      .from('xp_events').select('*')
      .eq('event_date', date)
      .order('created_at'),
  ])

  const completedTaskIds = (completions || []).map(c => c.task_id)
  const totalPts = (xpEvents || []).reduce((sum, e) => sum + e.xp_delta, 0)

  return {
    date,
    tasks: (tasks || []) as Task[],
    completedTaskIds,
    xpEvents: (xpEvents || []) as XpEvent[],
    totalPts,
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, headers } = await requireAuth(request)
  const { date } = params as { date: string }
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const task_id = formData.get('task_id') as string

  if (!task_id) return data({ error: 'Missing task_id' }, { status: 400, headers })

  if (intent === 'complete') {
    const { data: task } = await supabase
      .from('tasks').select('*').eq('id', task_id).single()
    if (!task) return data({ error: 'Task not found' }, { status: 404, headers })

    await supabase.from('daily_completions').upsert(
      { task_id, completed_date: date },
      { onConflict: 'task_id,completed_date', ignoreDuplicates: true }
    )

    const { data: existing } = await supabase
      .from('xp_events').select('id')
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
    const { data: task } = await supabase.from('tasks').select('period').eq('id', task_id).single()

    await supabase.from('daily_completions').delete()
      .eq('task_id', task_id).eq('completed_date', date)
    await supabase.from('xp_events').delete()
      .eq('event_type', 'task').eq('event_date', date).eq('task_id', task_id)

    await revokePerfectDayIfNeeded(supabase, date)
    if (task?.period === 'morning') {
      await revokeStreakIfMorningIncomplete(supabase, date)
    }
  }

  return data({ success: true }, { headers })
}

function HistoryTaskItem({ task, done, date }: { task: Task; done: boolean; date: string }) {
  const fetcher = useFetcher()
  const isSubmitting = fetcher.state !== 'idle'
  const optimisticDone = isSubmitting ? !done : done

  return (
    <li>
      <fetcher.Form method="post">
        <input type="hidden" name="task_id" value={task.id} />
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

export default function HistoryDayPage() {
  const { date, tasks, completedTaskIds, xpEvents, totalPts } = useLoaderData<typeof loader>()
  const [showLedger, setShowLedger] = useState(false)

  const tasksByPeriod: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!tasksByPeriod[task.period]) tasksByPeriod[task.period] = []
    tasksByPeriod[task.period].push(task)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link
        to="/history"
        className="text-blue-400 text-sm mb-4 inline-flex items-center gap-1 hover:text-blue-300 transition-colors"
      >
        ‹ Calendar
      </Link>

      <div className="flex items-center justify-between mb-6 mt-2">
        <h1 className="text-xl font-bold text-white">{formatFriendlyDate(date)}</h1>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">{totalPts.toLocaleString()}</div>
          <div className="text-xs text-slate-400">pts earned</div>
        </div>
      </div>

      {PERIOD_ORDER.map(period => {
        const periodTasks = tasksByPeriod[period]
        if (!periodTasks?.length) return null
        const doneCount = periodTasks.filter(t => completedTaskIds.includes(t.id)).length
        const allDone = doneCount === periodTasks.length

        return (
          <div key={period} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                {PERIOD_LABELS[period]}
              </h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                allDone ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'
              }`}>
                {doneCount}/{periodTasks.length}
              </span>
            </div>
            <ul className="space-y-2">
              {periodTasks.map(task => (
                <HistoryTaskItem
                  key={task.id}
                  task={task}
                  done={completedTaskIds.includes(task.id)}
                  date={date}
                />
              ))}
            </ul>
          </div>
        )
      })}

      {/* Points Ledger — collapsed by default (Progressive Disclosure) */}
      <div className="border-t border-slate-700 pt-4">
        <button
          onClick={() => setShowLedger(v => !v)}
          className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-white py-2 transition-colors"
        >
          <span>Points Ledger ({xpEvents.length} events)</span>
          <span className="text-xs">{showLedger ? '▲' : '▼'}</span>
        </button>

        {showLedger && (
          <div className="mt-3 space-y-2">
            {xpEvents.length === 0 ? (
              <p className="text-slate-500 text-sm">No events for this day.</p>
            ) : (
              xpEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2 border border-slate-700"
                >
                  <div className="min-w-0 mr-3">
                    <div className="text-sm text-white truncate">{event.reason}</div>
                    <div className="text-xs text-slate-500">
                      {event.actor === 'parent' ? '🔒 Parent' : '⭐ Kove'} · {event.event_type.replace(/_/g, ' ')}
                    </div>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ${event.xp_delta >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {event.xp_delta >= 0 ? '+' : ''}{event.xp_delta} pts
                  </span>
                </div>
              ))
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-700 mt-2">
              <span className="text-slate-400">Net</span>
              <span className={totalPts >= 0 ? 'text-blue-400' : 'text-red-400'}>
                {totalPts >= 0 ? '+' : ''}{totalPts.toLocaleString()} pts
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
