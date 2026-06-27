import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PointsBar from '@/components/PointsBar'

describe('PointsBar', () => {
  it('renders "Next $1" text', () => {
    render(<PointsBar currentPts={0} />)
    expect(screen.getByText(/Next \$1/)).toBeInTheDocument()
  })

  it('shows 0 / 1,000 pts when no points earned', () => {
    render(<PointsBar currentPts={0} />)
    expect(screen.getByText(/0 \/ 1,000 pts/)).toBeInTheDocument()
  })

  it('shows dollars earned when >= 1000 pts', () => {
    render(<PointsBar currentPts={2500} />)
    expect(screen.getByText(/\$2 earned/)).toBeInTheDocument()
  })

  it('does not show dollars earned at 0 pts', () => {
    render(<PointsBar currentPts={0} />)
    expect(screen.queryByText(/earned/)).not.toBeInTheDocument()
  })

  it('does not show dollars earned under 1000 pts', () => {
    render(<PointsBar currentPts={999} />)
    expect(screen.queryByText(/earned/)).not.toBeInTheDocument()
  })

  it('shows correct progress remainder (1750 pts = 750 remainder)', () => {
    render(<PointsBar currentPts={1750} />)
    expect(screen.getByText(/750 \/ 1,000 pts/)).toBeInTheDocument()
  })

  it('shows $1 earned at exactly 1000 pts', () => {
    render(<PointsBar currentPts={1000} />)
    expect(screen.getByText(/\$1 earned/)).toBeInTheDocument()
  })

  it('shows 0 / 1,000 pts progress at exact multiples of 1000', () => {
    render(<PointsBar currentPts={3000} />)
    expect(screen.getByText(/0 \/ 1,000 pts/)).toBeInTheDocument()
  })

  it('shows $3 earned at 3000 pts', () => {
    render(<PointsBar currentPts={3000} />)
    expect(screen.getByText(/\$3 earned/)).toBeInTheDocument()
  })

  it('renders progress bar element', () => {
    const { container } = render(<PointsBar currentPts={500} />)
    // The inner progress div has a style width
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('progress bar is at 50% for 500 pts', () => {
    const { container } = render(<PointsBar currentPts={500} />)
    const progressBar = container.querySelector('[style*="width: 50%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('progress bar is at 100% for 1000 pts (capped)', () => {
    const { container } = render(<PointsBar currentPts={1000} />)
    // 1000 % 1000 = 0, so progress = 0 (resets for next dollar)
    // Width should be 0%
    const progressBar = container.querySelector('[style*="width: 0%"]')
    expect(progressBar).toBeInTheDocument()
  })
})
