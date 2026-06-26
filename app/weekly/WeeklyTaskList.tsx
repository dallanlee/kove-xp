'use client'

import { useState } from 'react'
import type { Task } from '@/types/database'

interface WeeklyTaskListProps {
  tasks: Task[]
  completedTaskIds: string[]
  weekStart: string
}

export default function WeeklyTaskList({ tasks, completedTaskIds: initialCompleted, weekStart }: WeeklyTaskListProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompleted))
  const [pending, setPending] = useState<Set<string>>(new Set())

  async function toggleTask(task: Task) {
    if (pending.has(task.id)) return
    const isCompleted = completedIds.has(task.id)
    const newCompleted = new Set(completedIds)

    if (isCompleted) {
      newCompleted.delete(task.id)
    } else {
      newCompleted.add(task.id)
    }
    setCompletedIds(newCompleted)
    setPending(p => new Set(p).add(task.id))

    const endpoint = isCompleted ? '/api/uncomplete-weekly-task' : '/api/complete-weekly-task'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, week_start: weekStart }),
      })
      if (!res.ok) {
        setCompletedIds(new Set(completedIds))
      }
    } catch {
      setCompletedIds(new Set(completedIds))
    } finally {
      setPending(p => {
        const next = new Set(p)
        next.delete(task.id)
        return next
      })
    }
  }

  return (
    <ul className="space-y-2">
      {tasks.map(task => {
        const done = completedIds.has(task.id)
        const loading = pending.has(task.id)

        return (
          <li key={task.id}>
            <button
              onClick={() => toggleTask(task)}
              disabled={loading}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl border transition-all
                ${done
                  ? 'bg-green-900/30 border-green-700 opacity-80'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 active:scale-[0.99]'
                }
                ${loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
              `}
            >
              <div className={`
                w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                ${done ? 'bg-green-400 border-green-400' : 'border-slate-500 bg-transparent'}
              `}>
                {done && <span className="text-slate-900 text-sm font-bold">✓</span>}
              </div>
              <span className={`flex-1 text-left text-sm font-medium ${done ? 'line-through text-slate-500' : 'text-white'}`}>
                {task.name}
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                done ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'
              }`}>
                +{task.xp} XP
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
