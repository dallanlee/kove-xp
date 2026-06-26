interface PointsBarProps {
  currentPts: number
}

export default function PointsBar({ currentPts }: PointsBarProps) {
  const PTS_PER_DOLLAR = 1000
  const progress = currentPts % PTS_PER_DOLLAR
  const fullDollars = Math.floor(currentPts / PTS_PER_DOLLAR)
  const percent = Math.min((progress / PTS_PER_DOLLAR) * 100, 100)

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">
          {fullDollars > 0 && (
            <span className="text-green-400 font-bold mr-1">${fullDollars} earned</span>
          )}
          Next $1
        </span>
        <span className="text-xs text-blue-400 font-mono">
          {progress.toLocaleString()} / 1,000 pts
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
