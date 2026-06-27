import { describe, it, expect } from 'vitest'
import { xpToDollars, xpToScreenTime, xpRemainder } from '@/lib/xp'

describe('xpToDollars', () => {
  it('converts 1000 pts to $1', () => {
    expect(xpToDollars(1000)).toBe(1)
  })

  it('converts 2000 pts to $2', () => {
    expect(xpToDollars(2000)).toBe(2)
  })

  it('floors partial amounts (1999 → $1)', () => {
    expect(xpToDollars(1999)).toBe(1)
  })

  it('floors partial amounts (999 → $0)', () => {
    expect(xpToDollars(999)).toBe(0)
  })

  it('handles 0', () => {
    expect(xpToDollars(0)).toBe(0)
  })

  it('converts large amounts correctly', () => {
    expect(xpToDollars(5500)).toBe(5)
    expect(xpToDollars(10000)).toBe(10)
  })

  it('handles exact multiples', () => {
    expect(xpToDollars(3000)).toBe(3)
  })
})

describe('xpToScreenTime', () => {
  it('converts 1000 pts to 30 minutes', () => {
    expect(xpToScreenTime(1000)).toBe(30)
  })

  it('converts 2000 pts to 60 minutes', () => {
    expect(xpToScreenTime(2000)).toBe(60)
  })

  it('floors partial 1000-pt increments (1500 → 30 min)', () => {
    expect(xpToScreenTime(1500)).toBe(30)
  })

  it('handles 0', () => {
    expect(xpToScreenTime(0)).toBe(0)
  })

  it('handles amounts under 1000 (999 → 0 min)', () => {
    expect(xpToScreenTime(999)).toBe(0)
  })

  it('converts large amounts (5000 → 150 min)', () => {
    expect(xpToScreenTime(5000)).toBe(150)
  })
})

describe('xpRemainder', () => {
  it('returns remainder after 1000-pt blocks', () => {
    expect(xpRemainder(1500)).toBe(500)
  })

  it('returns 0 for exact multiples of 1000', () => {
    expect(xpRemainder(3000)).toBe(0)
  })

  it('returns full amount when under 1000', () => {
    expect(xpRemainder(750)).toBe(750)
  })

  it('handles 0', () => {
    expect(xpRemainder(0)).toBe(0)
  })

  it('returns 999 for 1999', () => {
    expect(xpRemainder(1999)).toBe(999)
  })

  it('returns 1 for 5001', () => {
    expect(xpRemainder(5001)).toBe(1)
  })
})
