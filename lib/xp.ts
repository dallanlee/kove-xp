import type { SupabaseClient } from '@supabase/supabase-js'
import type { Family } from '@/types/database'

export async function weeklyXpTotal(supabase: SupabaseClient, weekStart: string): Promise<number> {
  // weekStart is Monday; week ends Sunday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('xp_events')
    .select('xp_delta')
    .gte('event_date', weekStart)
    .lte('event_date', weekEndStr)
    .neq('event_type', 'payout_conversion')

  if (error) throw error
  return (data as { xp_delta: number }[]).reduce((sum, e) => sum + e.xp_delta, 0)
}

export async function dailyXpTotal(supabase: SupabaseClient, date: string): Promise<number> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('xp_delta')
    .eq('event_date', date)

  if (error) throw error
  return (data as { xp_delta: number }[]).reduce((sum, e) => sum + e.xp_delta, 0)
}

export function xpToDollars(xp: number): number {
  return Math.floor(xp / 1000)
}

export function xpToScreenTime(xp: number): number {
  return Math.floor(xp / 1000) * 30
}

export function xpRemainder(xp: number): number {
  return xp % 1000
}

export async function getFamily(supabase: SupabaseClient): Promise<Family> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .single()

  if (error) throw error
  return data as Family
}
