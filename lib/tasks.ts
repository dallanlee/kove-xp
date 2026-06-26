import type { SupabaseClient } from '@supabase/supabase-js'
import type { Period, Task, DailyCompletion, WeeklyCompletion } from '@/types/database'

export async function getTasks(supabase: SupabaseClient, period?: Period): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (period) {
    query = query.eq('period', period)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Task[]
}

export async function getDailyCompletions(supabase: SupabaseClient, date: string): Promise<DailyCompletion[]> {
  const { data, error } = await supabase
    .from('daily_completions')
    .select('*')
    .eq('completed_date', date)

  if (error) throw error
  return data as DailyCompletion[]
}

export async function getWeeklyCompletions(supabase: SupabaseClient, weekStart: string): Promise<WeeklyCompletion[]> {
  const { data, error } = await supabase
    .from('weekly_completions')
    .select('*')
    .eq('week_start', weekStart)

  if (error) throw error
  return data as WeeklyCompletion[]
}

export async function getMorningTaskIds(supabase: SupabaseClient): Promise<string[]> {
  const tasks = await getTasks(supabase, 'morning')
  return tasks.map(t => t.id)
}

export async function getAllMandatoryTaskIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('is_active', true)
    .in('period', ['morning', 'afternoon', 'bedtime'])

  if (error) throw error
  return (data as { id: string }[]).map(t => t.id)
}
