import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StreakCounter from '@/components/StreakCounter'

describe('StreakCounter', () => {
  it('renders streak count as text', () => {
    render(<StreakCounter streak={7} />)
    expect(screen.getByText('7 day streak')).toBeInTheDocument()
  })

  it('shows "No streak yet" at 0', () => {
    render(<StreakCounter streak={0} />)
    expect(screen.getByText(/No streak yet/)).toBeInTheDocument()
  })

  it('does not show day count text at 0 streak', () => {
    render(<StreakCounter streak={0} />)
    expect(screen.queryByText(/day streak/)).not.toBeInTheDocument()
  })

  it('shows singular "1 day streak" for streak of 1', () => {
    render(<StreakCounter streak={1} />)
    expect(screen.getByText('1 day streak')).toBeInTheDocument()
  })

  it('shows plural "N day streak" for streak > 1', () => {
    render(<StreakCounter streak={5} />)
    expect(screen.getByText('5 day streak')).toBeInTheDocument()
  })

  it('shows next milestone hint for streak < 3', () => {
    render(<StreakCounter streak={1} />)
    expect(screen.getByText(/2 more days? for 3-day bonus/)).toBeInTheDocument()
  })

  it('shows 3-day milestone hint correctly', () => {
    render(<StreakCounter streak={1} />)
    // 3 - 1 = 2 more days
    expect(screen.getByText(/2 more days/)).toBeInTheDocument()
  })

  it('shows next milestone hint after passing 3-day (heading to 7)', () => {
    render(<StreakCounter streak={4} />)
    // next milestone is 7, 7 - 4 = 3 more days
    expect(screen.getByText(/3 more days/)).toBeInTheDocument()
  })

  it('shows max milestone message at streak >= 14', () => {
    render(<StreakCounter streak={14} />)
    expect(screen.getByText(/Max milestone reached/)).toBeInTheDocument()
  })

  it('still shows max milestone message well above 14', () => {
    render(<StreakCounter streak={30} />)
    expect(screen.getByText(/Max milestone reached/)).toBeInTheDocument()
  })

  it('does not show max milestone message below 14', () => {
    render(<StreakCounter streak={13} />)
    expect(screen.queryByText(/Max milestone reached/)).not.toBeInTheDocument()
  })

  it('flame emoji display: uses count for streak ≤ 5', () => {
    render(<StreakCounter streak={3} />)
    // Should show 3 flame emojis (not "🔥 3")
    const { container } = render(<StreakCounter streak={3} />)
    expect(container.textContent).toContain('🔥🔥🔥')
  })

  it('flame emoji display: uses number for streak > 5', () => {
    const { container } = render(<StreakCounter streak={10} />)
    expect(container.textContent).toContain('🔥 10')
  })
})
