import { describe, it, expect, vi, afterEach } from 'vitest'
import { getTodayMT, getMostRecentMondayMT, addDaysToDate, formatFriendlyDate } from '@/lib/date'

afterEach(() => {
  vi.useRealTimers()
})

describe('getTodayMT', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = getTodayMT()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns Mountain Time date at noon UTC (unambiguous)', () => {
    // noon UTC Jan 15 2024 = 5am MST — still Jan 15 in MT
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    expect(getTodayMT()).toBe('2024-01-15')
  })

  it('handles MT winter (MST = UTC-7) day boundary: 6:59am UTC is still prev day in MT', () => {
    // Jan 15 06:59 UTC = Jan 14 23:59 MST (UTC-7)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T06:59:00Z'))
    expect(getTodayMT()).toBe('2024-01-14')
  })

  it('handles MT winter boundary: 7:00am UTC is new day in MT', () => {
    // Jan 15 07:00 UTC = Jan 15 00:00 MST
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T07:00:00Z'))
    expect(getTodayMT()).toBe('2024-01-15')
  })

  it('handles MT summer (MDT = UTC-6) day boundary: 5:59am UTC is still prev day', () => {
    // Jun 15 05:59 UTC = Jun 14 23:59 MDT (UTC-6)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T05:59:00Z'))
    expect(getTodayMT()).toBe('2024-06-14')
  })

  it('handles MT summer boundary: 6:00am UTC is new day in MT', () => {
    // Jun 15 06:00 UTC = Jun 15 00:00 MDT
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T06:00:00Z'))
    expect(getTodayMT()).toBe('2024-06-15')
  })

  it('is NOT the same as UTC at MT midnight (critical regression)', () => {
    // 5am UTC Jan 15 = still Jan 14 in MT (MST)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T05:00:00Z'))
    // UTC would give 2024-01-15, but MT should give 2024-01-14
    const mtDate = getTodayMT()
    const utcDate = new Date('2024-01-15T05:00:00Z').toISOString().split('T')[0]
    expect(mtDate).toBe('2024-01-14')
    expect(mtDate).not.toBe(utcDate) // proves it's not just using UTC
  })
})

describe('getMostRecentMondayMT', () => {
  it('returns the same Monday if today is Monday', () => {
    // Jan 15 2024 = Monday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-15')
  })

  it('returns previous Monday if today is Tuesday', () => {
    // Jan 16 2024 = Tuesday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-16T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-15')
  })

  it('returns previous Monday if today is Wednesday', () => {
    // Jan 17 2024 = Wednesday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-17T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-15')
  })

  it('returns previous Monday if today is Sunday', () => {
    // Jan 21 2024 = Sunday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-21T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-15')
  })

  it('returns previous Monday if today is Saturday', () => {
    // Jan 20 2024 = Saturday
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-15')
  })

  it('handles week crossing month boundary', () => {
    // Feb 1 2024 = Thursday — prev Monday is Jan 29
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-02-01T12:00:00Z'))
    expect(getMostRecentMondayMT()).toBe('2024-01-29')
  })
})

describe('addDaysToDate', () => {
  it('adds days within same month', () => {
    expect(addDaysToDate('2024-01-15', 3)).toBe('2024-01-18')
  })

  it('handles crossing month boundary', () => {
    expect(addDaysToDate('2024-01-30', 3)).toBe('2024-02-02')
  })

  it('handles crossing year boundary', () => {
    expect(addDaysToDate('2024-12-31', 1)).toBe('2025-01-01')
  })

  it('handles subtracting days (negative)', () => {
    expect(addDaysToDate('2024-01-15', -5)).toBe('2024-01-10')
  })

  it('handles subtracting past month boundary', () => {
    expect(addDaysToDate('2024-02-03', -5)).toBe('2024-01-29')
  })

  it('handles adding 0 days', () => {
    expect(addDaysToDate('2024-06-15', 0)).toBe('2024-06-15')
  })

  it('handles leap year Feb 28 + 1 day', () => {
    expect(addDaysToDate('2024-02-28', 1)).toBe('2024-02-29') // 2024 is leap
  })

  it('handles non-leap year Feb 28 + 1 day', () => {
    expect(addDaysToDate('2023-02-28', 1)).toBe('2023-03-01') // 2023 not leap
  })
})

describe('formatFriendlyDate', () => {
  it('formats Monday Jan 15 2024 correctly', () => {
    const result = formatFriendlyDate('2024-01-15')
    expect(result).toContain('Monday')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })

  it('includes the day number not shifted by UTC', () => {
    // Using local constructor avoids timezone shifts — day should always match
    const result = formatFriendlyDate('2024-06-15')
    expect(result).toContain('15')
    expect(result).not.toMatch(/\b14\b/) // must not shift to 14
  })

  it('formats last day of month correctly', () => {
    const result = formatFriendlyDate('2024-01-31')
    expect(result).toContain('31')
  })

  it('returns a non-empty string for any valid date', () => {
    expect(formatFriendlyDate('2024-12-25')).toBeTruthy()
    expect(formatFriendlyDate('2024-01-01')).toBeTruthy()
  })
})
