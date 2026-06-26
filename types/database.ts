export type Period = 'morning' | 'afternoon' | 'bedtime' | 'health' | 'weekly' | 'bonus'
export type EventType = 'task' | 'streak_bonus' | 'perfect_day' | 'perfect_week' | 'penalty' | 'makeup' | 'bonus_award' | 'payout_conversion'

export interface Family {
  id: string
  name: string
  parent_pin_hash: string
  dollar_balance: number
  screen_time_minutes: number
  xp_balance: number
  current_streak: number
  longest_streak: number
  last_streak_date: string | null
  created_at: string
}

export interface Task {
  id: string
  name: string
  xp: number
  period: Period
  is_active: boolean
  sort_order: number
}

export interface DailyCompletion {
  id: string
  task_id: string
  completed_date: string
  completed_at: string
}

export interface WeeklyCompletion {
  id: string
  task_id: string
  week_start: string
  completed_at: string
}

export interface XpEvent {
  id: string
  xp_delta: number
  reason: string
  event_type: EventType
  task_id: string | null
  event_date: string
  created_at: string
}

export interface Payout {
  id: string
  week_start: string
  gross_xp: number
  streak_bonus_xp: number
  perfect_day_bonus_xp: number
  perfect_week_bonus_xp: number
  total_xp: number
  xp_to_dollars: number
  xp_to_screen_time: number
  dollars_earned: number
  screen_time_earned_minutes: number
  interest_earned: number
  new_dollar_balance: number
  new_screen_time_balance: number
  xp_carried_forward: number
  created_at: string
}
