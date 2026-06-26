'use client'

interface XPBarProps {
  currentXp: number
}

export default function XPBar({ currentXp }: XPBarProps) {
  const XP_PER_DOLLAR = 1000
  const progress = currentXp % XP_PER_DOLLAR
  const fullDollars = Math.floor(currentXp / XP_PER_DOLLAR)
  const percent = Math.min((progress / XP_PER_DOLLAR) * 100, 100)

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-400">
          {fullDollars > 0 && (
            <span className="text-yellow-400 font-bold mr-1">${fullDollars} earned</span>
          )}
          Next $1
        </span>
        <span className="text-xs text-yellow-400 font-mono">
          {progress.toLocaleString()} / 1,000 XP
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
