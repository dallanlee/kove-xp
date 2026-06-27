interface StreakCounterProps {
  streak: number
}

const MILESTONES = [3, 7, 14]

export default function StreakCounter({ streak }: StreakCounterProps) {
  const nextMilestone = MILESTONES.find(m => m > streak)
  const flameDisplay = streak <= 5
    ? '🔥'.repeat(streak)
    : `🔥 ${streak}`

  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold text-orange-400">
        {streak === 0 ? '⬜ No streak yet' : flameDisplay}
      </div>
      {streak > 0 && (
        <div className="text-xs text-slate-400 mt-1">
          {streak === 1 ? '1 day streak' : `${streak} day streak`}
        </div>
      )}
      {nextMilestone && (
        <div className="text-xs text-orange-300 mt-1">
          {nextMilestone - streak} more day{nextMilestone - streak !== 1 ? 's' : ''} for {nextMilestone}-day bonus!
        </div>
      )}
      {streak >= 14 && (
        <div className="text-xs text-blue-400 mt-1">
          Max milestone reached! Keep it up!
        </div>
      )}
    </div>
  )
}
