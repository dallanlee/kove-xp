import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireAuth } from '@/lib/auth'
import { getTodayMT } from '@/lib/date'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireAuth(request)
  const url = new URL(request.url)

  const today = getTodayMT()
  const monthParam = url.searchParams.get('month') ?? today.slice(0, 7)

  const [year, month] = monthParam.split('-').map(Number)
  const firstDay = `${monthParam}-01`
  const daysInMonth = new Date(year, month, 0).getDate()
  const lastDayStr = `${monthParam}-${String(daysInMonth).padStart(2, '0')}`

  const { data: tasks } = await supabase
    .from('tasks').select('id')
    .eq('is_active', true)
    .in('period', ['morning', 'afternoon', 'bedtime', 'health'])
  const totalTasks = (tasks || []).length

  const [{ data: completions }, { data: xpEvents }] = await Promise.all([
    supabase.from('daily_completions')
      .select('task_id, completed_date')
      .gte('completed_date', firstDay)
      .lte('completed_date', lastDayStr),
    supabase.from('xp_events')
      .select('xp_delta, event_date')
      .gte('event_date', firstDay)
      .lte('event_date', lastDayStr),
  ])

  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthParam}-${String(d).padStart(2, '0')}`
    const dayCompletions = (completions || []).filter(c => c.completed_date === dateStr)
    const ptsEarned = (xpEvents || [])
      .filter(e => e.event_date === dateStr)
      .reduce((sum, e) => sum + e.xp_delta, 0)
    days.push({ date: dateStr, completedCount: dayCompletions.length, totalCount: totalTasks, ptsEarned })
  }

  const prevMonth = month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, '0')}`
  const nextMonth = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`

  return { month: monthParam, days, today, prevMonth, nextMonth }
}

export default function HistoryPage() {
  const { month, days, today, prevMonth, nextMonth } = useLoaderData<typeof loader>()
  const [year, monthNum] = month.split('-').map(Number)
  const firstDow = new Date(year, monthNum - 1, 1).getDay()
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  })
  const isNextFuture = nextMonth > today.slice(0, 7)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          to={`/history?month=${prevMonth}`}
          className="text-slate-400 hover:text-white p-2 text-xl leading-none"
        >
          ‹
        </Link>
        <h1 className="text-lg font-bold text-white">{monthLabel}</h1>
        <Link
          to={isNextFuture ? '#' : `/history?month=${nextMonth}`}
          className={`p-2 text-xl leading-none transition-colors ${
            isNextFuture ? 'text-slate-700 pointer-events-none' : 'text-slate-400 hover:text-white'
          }`}
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }, (_, i) => <div key={`blank-${i}`} />)}

        {days.map(({ date, completedCount, totalCount, ptsEarned }) => {
          const isFuture = date > today
          const isToday = date === today
          const ratio = totalCount > 0 ? completedCount / totalCount : 0
          const perfect = ratio === 1 && totalCount > 0
          const partial = ratio > 0 && ratio < 1
          const dayNum = parseInt(date.split('-')[2])

          return (
            <Link
              key={date}
              to={isFuture ? '#' : `/history/${date}`}
              className={[
                'aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-xs',
                isFuture
                  ? 'opacity-20 pointer-events-none bg-slate-800 border border-slate-800'
                  : 'hover:scale-105 cursor-pointer',
                isToday ? 'ring-2 ring-blue-400' : '',
                !isFuture && perfect
                  ? 'bg-green-900/50 border border-green-600'
                  : !isFuture && partial
                  ? 'bg-blue-900/30 border border-blue-700'
                  : !isFuture
                  ? 'bg-slate-800 border border-slate-700'
                  : '',
              ].join(' ')}
            >
              <span className={`font-bold ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>
                {dayNum}
              </span>
              {!isFuture && ptsEarned > 0 && (
                <span className="text-[9px] text-blue-400 leading-none">
                  {ptsEarned >= 1000 ? `${(ptsEarned / 1000).toFixed(1)}k` : ptsEarned}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className="flex gap-4 mt-5 justify-center text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-900/50 border border-green-600 inline-block" />
          Perfect
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-900/30 border border-blue-700 inline-block" />
          Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block" />
          None
        </span>
      </div>

      <div className="mt-10 flex justify-center">
        <form method="post" action="/logout">
          <button
            type="submit"
            className="text-xs text-slate-700 hover:text-slate-500 transition-colors py-2 px-4"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
