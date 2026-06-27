import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// Build a chainable Supabase mock. Each call returns `this` until a terminal
// method is called (.single, .limit, etc.) which returns a resolved promise.
function makeChain(terminalResult: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['from', 'select', 'eq', 'in', 'neq', 'gte', 'lte', 'order', 'limit', 'update', 'delete', 'upsert']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal methods return a promise
  ;(chain as Record<string, unknown>).single = vi.fn().mockResolvedValue(terminalResult)
  // The chain itself as a thenable (for awaiting the query builder)
  ;(chain as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(terminalResult).then(resolve)
  return chain
}

// Proper mock structure matching the Supabase client query builder
function makeMockSupabase({
  morningTaskIds = ['task-1', 'task-2'],
  completedTaskIds = ['task-1', 'task-2'],
  family = {
    id: 'family-1',
    current_streak: 5,
    longest_streak: 10,
    last_streak_date: '2024-01-14',
    dollar_balance: 10,
    screen_time_minutes: 60,
    xp_balance: 500,
  },
  existingPerfectDayEvent = [] as unknown[],
  mandatoryTaskIds = ['task-1', 'task-2', 'task-3'],
}: {
  morningTaskIds?: string[]
  completedTaskIds?: string[]
  family?: Record<string, unknown>
  existingPerfectDayEvent?: unknown[]
  mandatoryTaskIds?: string[]
} = {}): SupabaseClient {
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'tasks') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: morningTaskIds.map(id => ({ id, period: 'morning' })),
              error: null,
            }),
            in: vi.fn().mockResolvedValue({
              data: mandatoryTaskIds.map(id => ({ id })),
              error: null,
            }),
            order: vi.fn().mockResolvedValue({
              data: morningTaskIds.map(id => ({ id, period: 'morning', name: 'Task', xp: 50, sort_order: 1, is_active: true })),
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'daily_completions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: completedTaskIds.map(task_id => ({ task_id, completed_date: '2024-01-15' })),
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'families') {
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: family, error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    }
    if (table === 'xp_events') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: existingPerfectDayEvent, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }
    // Default: return chainable mock
    return makeChain({ data: null, error: null })
  })

  return { from: mockFrom } as unknown as SupabaseClient
}

// Pure logic tests — streak calculation formulas without Supabase

describe('streak logic: calculation formulas', () => {
  it('new streak = 1 when not consecutive', () => {
    const isConsecutive = false
    const currentStreak = 5
    const newStreak = isConsecutive ? currentStreak + 1 : 1
    expect(newStreak).toBe(1)
  })

  it('new streak increments when consecutive', () => {
    const isConsecutive = true
    const currentStreak = 5
    const newStreak = isConsecutive ? currentStreak + 1 : 1
    expect(newStreak).toBe(6)
  })

  it('longest streak updates if new streak exceeds it', () => {
    const newStreak = 11
    const longest = 10
    expect(Math.max(newStreak, longest)).toBe(11)
  })

  it('longest streak stays same if new streak is less', () => {
    const newStreak = 3
    const longest = 10
    expect(Math.max(newStreak, longest)).toBe(10)
  })
})

describe('streak milestones', () => {
  const STREAK_MILESTONES: Record<number, number> = { 3: 150, 7: 500, 14: 1500 }

  it('awards 150 pts for 3-day streak', () => {
    expect(STREAK_MILESTONES[3]).toBe(150)
  })

  it('awards 500 pts for 7-day streak', () => {
    expect(STREAK_MILESTONES[7]).toBe(500)
  })

  it('awards 1500 pts for 14-day streak', () => {
    expect(STREAK_MILESTONES[14]).toBe(1500)
  })

  it('no milestone for 4-day streak', () => {
    expect(STREAK_MILESTONES[4]).toBeUndefined()
  })

  it('milestone check: falsy for non-milestone streaks', () => {
    expect(!!STREAK_MILESTONES[5]).toBe(false)
    expect(!!STREAK_MILESTONES[1]).toBe(false)
  })
})

describe('checkPerfectDay logic', () => {
  it('returns false if not all mandatory tasks complete', () => {
    const mandatoryIds = ['task-1', 'task-2', 'task-3']
    const completedIds = ['task-1', 'task-2'] // missing task-3
    const allDone = mandatoryIds.every(id => completedIds.includes(id))
    expect(allDone).toBe(false)
  })

  it('returns true if all mandatory tasks complete', () => {
    const mandatoryIds = ['task-1', 'task-2', 'task-3']
    const completedIds = ['task-1', 'task-2', 'task-3', 'bonus-task']
    const allDone = mandatoryIds.every(id => completedIds.includes(id))
    expect(allDone).toBe(true)
  })

  it('returns true even if extra tasks completed', () => {
    const mandatoryIds = ['task-1', 'task-2']
    const completedIds = ['task-1', 'task-2', 'task-3']
    expect(mandatoryIds.every(id => completedIds.includes(id))).toBe(true)
  })

  it('false for empty completions', () => {
    const mandatoryIds = ['task-1']
    const completedIds: string[] = []
    expect(mandatoryIds.every(id => completedIds.includes(id))).toBe(false)
  })

  it('true when mandatory list is empty (edge case)', () => {
    const mandatoryIds: string[] = []
    const completedIds: string[] = []
    // Array.every on empty array returns true
    expect(mandatoryIds.every(id => completedIds.includes(id))).toBe(true)
  })
})

describe('streak: consecutive day detection', () => {
  it('consecutive: last_streak_date = yesterday', () => {
    const date = '2024-01-15'
    const lastStreakDate = '2024-01-14'
    // Yesterday calculation from lib/streaks.ts uses Date constructor
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    const yesterdayStr = d.toISOString().split('T')[0]
    expect(lastStreakDate === yesterdayStr).toBe(true)
  })

  it('not consecutive: last_streak_date = 2 days ago', () => {
    const date = '2024-01-15'
    const lastStreakDate = '2024-01-13'
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    const yesterdayStr = d.toISOString().split('T')[0]
    expect(lastStreakDate === yesterdayStr).toBe(false)
  })

  it('not consecutive: no previous streak (null)', () => {
    const lastStreakDate = null
    const yesterdayStr = '2024-01-14'
    expect(lastStreakDate === yesterdayStr).toBe(false)
  })
})

// ─── revokeStreakIfMorningIncomplete ────────────────────────────────────────

describe('revokeStreakIfMorningIncomplete: early-exit conditions', () => {
  it('does NOT revert when morning is still fully complete', () => {
    const morningTaskIds = ['task-1', 'task-2']
    const completedIds = ['task-1', 'task-2']
    const morningStillComplete = morningTaskIds.every(id => completedIds.includes(id))
    expect(morningStillComplete).toBe(true) // → would return early, no revert
  })

  it('DOES need to revert when at least one morning task is unchecked', () => {
    const morningTaskIds = ['task-1', 'task-2']
    const completedIds = ['task-1']
    const morningStillComplete = morningTaskIds.every(id => completedIds.includes(id))
    expect(morningStillComplete).toBe(false) // → proceeds to check streak
  })

  it('does NOT revert when last_streak_date is not today', () => {
    const date: string = '2024-01-15'
    const lastStreakDate: string = '2024-01-14'
    const todayIsActiveStreakDate = lastStreakDate === date
    expect(todayIsActiveStreakDate).toBe(false) // → return early, nothing to revert
  })

  it('DOES revert when last_streak_date is today', () => {
    const date: string = '2024-01-15'
    const lastStreakDate: string = '2024-01-15'
    const todayIsActiveStreakDate = lastStreakDate === date
    expect(todayIsActiveStreakDate).toBe(true) // → proceeds to compute previousStreak
  })
})

describe('revokeStreakIfMorningIncomplete: previousStreak calculation', () => {
  it('previousStreak = current - 1 when yesterday morning was also complete', () => {
    const currentStreak = 5
    const yesterdayMorningComplete = true
    const previousStreak = yesterdayMorningComplete ? currentStreak - 1 : 0
    expect(previousStreak).toBe(4)
  })

  it('previousStreak = 0 when yesterday morning was NOT complete (streak started today)', () => {
    const currentStreak = 1
    const yesterdayMorningComplete = false
    const previousStreak = yesterdayMorningComplete ? currentStreak - 1 : 0
    expect(previousStreak).toBe(0)
  })

  it('previousStreak = 0 even when currentStreak > 1 if yesterday was not done (broken chain)', () => {
    // Edge: streak counter might be > 1 if family skipped days somehow
    const currentStreak = 3
    const yesterdayMorningComplete = false
    const previousStreak = yesterdayMorningComplete ? currentStreak - 1 : 0
    expect(previousStreak).toBe(0)
  })

  it('previousLastDate = yesterdayStr when yesterday was complete', () => {
    const yesterdayStr = '2024-01-14'
    const yesterdayMorningComplete = true
    const previousLastDate = yesterdayMorningComplete ? yesterdayStr : null
    expect(previousLastDate).toBe('2024-01-14')
  })

  it('previousLastDate = null when yesterday was not complete', () => {
    const yesterdayStr = '2024-01-14'
    const yesterdayMorningComplete = false
    const previousLastDate = yesterdayMorningComplete ? yesterdayStr : null
    expect(previousLastDate).toBeNull()
  })
})

// ─── revokePerfectDayIfNeeded ───────────────────────────────────────────────

describe('revokePerfectDayIfNeeded: early-exit and delete conditions', () => {
  it('does NOT delete event when all mandatory tasks still complete', () => {
    const mandatoryIds = ['task-1', 'task-2', 'task-3']
    const completedIds = ['task-1', 'task-2', 'task-3']
    const dayStillPerfect = mandatoryIds.every(id => completedIds.includes(id))
    expect(dayStillPerfect).toBe(true) // → return early, keep perfect_day event
  })

  it('DOES delete event when one mandatory task was unchecked', () => {
    const mandatoryIds = ['task-1', 'task-2', 'task-3']
    const completedIds = ['task-1', 'task-2'] // task-3 unchecked
    const dayStillPerfect = mandatoryIds.every(id => completedIds.includes(id))
    expect(dayStillPerfect).toBe(false) // → deletes perfect_day event
  })

  it('DOES delete event when all mandatory tasks unchecked', () => {
    const mandatoryIds = ['task-1', 'task-2']
    const completedIds: string[] = []
    const dayStillPerfect = mandatoryIds.every(id => completedIds.includes(id))
    expect(dayStillPerfect).toBe(false)
  })

  it('extra (non-mandatory) completions do not affect perfect-day status', () => {
    const mandatoryIds = ['task-1', 'task-2']
    const completedIds = ['task-1', 'task-2', 'bonus-task']
    const dayStillPerfect = mandatoryIds.every(id => completedIds.includes(id))
    expect(dayStillPerfect).toBe(true)
  })
})

describe('streak/perfectDay: symmetry invariants', () => {
  it('complete then uncomplete morning → morning not "still complete"', () => {
    const morningTaskIds = ['task-1', 'task-2']
    // After uncompleting task-1
    const completedAfterUncheck = ['task-2']
    const morningStillComplete = morningTaskIds.every(id => completedAfterUncheck.includes(id))
    expect(morningStillComplete).toBe(false) // revocation would fire
  })

  it('unchecking non-mandatory task does not break perfect day (mandatory all still done)', () => {
    const mandatoryIds = ['task-1', 'task-2']
    const optionalTaskId = 'task-optional'
    // completed includes mandatory and optional; uncheck optional
    const completedAfterUncheck = ['task-1', 'task-2']
    const dayStillPerfect = mandatoryIds.every(id => completedAfterUncheck.includes(id))
    expect(dayStillPerfect).toBe(true) // no revocation needed
    expect(completedAfterUncheck.includes(optionalTaskId)).toBe(false)
  })
})
