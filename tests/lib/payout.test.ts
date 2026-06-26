import { describe, it, expect } from 'vitest'

// Inline the pure calculation logic from payout.ts to test it without Supabase
// These formulas mirror runSundayPayout exactly

function calcDollarsEarned(xpToDollarsInput: number): number {
  return Math.floor(xpToDollarsInput / 1000)
}

function calcScreenTimeEarned(xpToScreenTimeInput: number): number {
  return Math.floor(xpToScreenTimeInput / 1000) * 30
}

function calcInterestEarned(dollarBalance: number): number {
  return Math.round(dollarBalance * 0.10 * 100) / 100
}

function calcXpCarriedForward(
  totalXp: number,
  xpToDollarsInput: number,
  xpToScreenTimeInput: number
): number {
  return (
    totalXp - xpToDollarsInput - xpToScreenTimeInput +
    (xpToDollarsInput % 1000) +
    (xpToScreenTimeInput % 1000)
  )
}

function calcNewDollarBalance(
  currentBalance: number,
  dollarsEarned: number,
  interestEarned: number
): number {
  return Number((currentBalance + dollarsEarned + interestEarned).toFixed(2))
}

describe('payout: dollars earned calculation', () => {
  it('3000 XP to dollars = $3', () => {
    expect(calcDollarsEarned(3000)).toBe(3)
  })

  it('2500 XP to dollars = $2 (floors)', () => {
    expect(calcDollarsEarned(2500)).toBe(2)
  })

  it('0 XP = $0', () => {
    expect(calcDollarsEarned(0)).toBe(0)
  })

  it('999 XP = $0 (below threshold)', () => {
    expect(calcDollarsEarned(999)).toBe(0)
  })
})

describe('payout: screen time earned calculation', () => {
  it('2000 XP = 60 minutes', () => {
    expect(calcScreenTimeEarned(2000)).toBe(60)
  })

  it('1000 XP = 30 minutes', () => {
    expect(calcScreenTimeEarned(1000)).toBe(30)
  })

  it('1500 XP = 30 minutes (floors to 1000-block)', () => {
    expect(calcScreenTimeEarned(1500)).toBe(30)
  })

  it('0 XP = 0 minutes', () => {
    expect(calcScreenTimeEarned(0)).toBe(0)
  })

  it('5000 XP = 150 minutes', () => {
    expect(calcScreenTimeEarned(5000)).toBe(150)
  })
})

describe('payout: interest calculation', () => {
  it('10% of $10.00 = $1.00', () => {
    expect(calcInterestEarned(10)).toBe(1)
  })

  it('10% of $5.50 = $0.55', () => {
    expect(calcInterestEarned(5.5)).toBe(0.55)
  })

  it('rounds to 2 decimal places', () => {
    // $3.33 * 10% = $0.333 → rounds to $0.33
    expect(calcInterestEarned(3.33)).toBe(0.33)
  })

  it('10% of $0 = $0', () => {
    expect(calcInterestEarned(0)).toBe(0)
  })
})

describe('payout: XP carried forward calculation', () => {
  it('carries forward remainder from dollars conversion', () => {
    // 5500 total, 3000 → $3, 0 screen time
    // carried = 5500 - 3000 - 0 + (3000 % 1000) + (0 % 1000)
    //          = 5500 - 3000 + 0 = 2500
    expect(calcXpCarriedForward(5500, 3000, 0)).toBe(2500)
  })

  it('carries forward remainder from both conversions', () => {
    // 5500 total, 2500 → $2 (500 remainder), 2000 → 60min (0 remainder)
    // carried = 5500 - 2500 - 2000 + 500 + 0 = 1500
    expect(calcXpCarriedForward(5500, 2500, 2000)).toBe(1500)
  })

  it('carries everything forward if no conversion', () => {
    expect(calcXpCarriedForward(3000, 0, 0)).toBe(3000)
  })

  it('handles partial amounts in both conversions', () => {
    // 4000 total, 1500 → $1 (500 leftover), 1500 → 30min (500 leftover)
    // carried = 4000 - 1500 - 1500 + 500 + 500 = 2000
    expect(calcXpCarriedForward(4000, 1500, 1500)).toBe(2000)
  })
})

describe('payout: new dollar balance calculation', () => {
  it('adds earned dollars and interest to existing balance', () => {
    // $5.00 balance + $3 earned + $0.50 interest = $8.50
    expect(calcNewDollarBalance(5.00, 3, 0.50)).toBe(8.50)
  })

  it('handles zero balance correctly', () => {
    expect(calcNewDollarBalance(0, 2, 0)).toBe(2.00)
  })

  it('rounds to 2 decimal places', () => {
    expect(calcNewDollarBalance(10.33, 1, 0.10)).toBe(11.43)
  })
})
