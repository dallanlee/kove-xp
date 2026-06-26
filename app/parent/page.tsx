'use client'

import { useState } from 'react'
import ParentPinModal from '@/components/ParentPinModal'

const PENALTIES = [
  { offense: 'Interrupting 3+ times', xp: -50 },
  { offense: 'Not doing thing 1st time asked', xp: -50 },
  { offense: 'Not doing thing 2nd time asked', xp: -100 },
  { offense: 'Not doing thing 3rd time asked', xp: -500 },
  { offense: 'Disrespect', xp: -50 },
  { offense: 'Lying / sneaking', xp: -200 },
  { offense: 'Missing a deadline', xp: -50 },
  { offense: 'Breaking screen time rules', xp: -100 },
  { offense: 'Bad eating choices', xp: -50 },
  { offense: 'Excessive rudeness / yelling / whining', xp: -50 },
]

export default function ParentPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Penalty confirm state
  const [pendingPenalty, setPendingPenalty] = useState<typeof PENALTIES[0] | null>(null)

  // Bonus state
  const [bonusReason, setBonusReason] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')

  // Payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutPreview, setPayoutPreview] = useState<Record<string, unknown> | null>(null)
  const [xpToDollars, setXpToDollars] = useState('')
  const [xpToScreen, setXpToScreen] = useState('')
  const [allowPayoutOverride, setAllowPayoutOverride] = useState(false)

  const today = new Date()
  const isSunday = today.getDay() === 0

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function applyPenalty(offense: string, xp: number) {
    const res = await fetch('/api/apply-penalty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offense, xp_delta: xp }),
    })
    if (res.ok) {
      showToast(`Penalty applied: ${offense} (${xp} XP)`)
    } else {
      showToast('Error applying penalty')
    }
    setPendingPenalty(null)
  }

  async function awardBonus() {
    if (!bonusReason || !bonusAmount) return
    const res = await fetch('/api/award-bonus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: bonusReason, xp_delta: parseInt(bonusAmount) }),
    })
    if (res.ok) {
      showToast(`Bonus awarded: ${bonusReason} (+${bonusAmount} XP)`)
      setBonusReason('')
      setBonusAmount('')
    } else {
      showToast('Error awarding bonus')
    }
  }

  async function runPayout() {
    const res = await fetch('/api/sunday-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xp_to_dollars: parseInt(xpToDollars) || 0,
        xp_to_screen_time: parseInt(xpToScreen) || 0,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setPayoutPreview(data.payout)
      showToast('Payout complete!')
      setShowPayoutModal(false)
    } else {
      showToast('Error running payout')
    }
  }

  if (!unlocked) {
    return <ParentPinModal onSuccess={() => setUnlocked(true)} />
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-300 mb-6">🔒 Parent Mode</h1>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-0 right-0 mx-4 max-w-sm mx-auto bg-slate-700 text-white px-4 py-3 rounded-xl shadow-lg z-50 text-sm text-center">
          {toast}
        </div>
      )}

      {/* Penalties */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Apply Penalty</h2>
        <div className="space-y-2">
          {PENALTIES.map(p => (
            <button
              key={p.offense}
              onClick={() => setPendingPenalty(p)}
              className="w-full flex justify-between items-center bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 hover:border-red-700 transition-colors text-left"
            >
              <span className="text-sm text-white">{p.offense}</span>
              <span className="text-red-400 font-bold text-sm ml-2">{p.xp} XP</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bonus Awards */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Award Bonus XP</h2>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Reason</label>
            <input
              type="text"
              value={bonusReason}
              onChange={e => setBonusReason(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-yellow-400 text-sm"
              placeholder="e.g. Helped with dishes unprompted"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">XP Amount</label>
            <input
              type="number"
              value={bonusAmount}
              onChange={e => setBonusAmount(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-yellow-400 text-sm"
              placeholder="e.g. 100"
              min="1"
            />
          </div>
          <button
            onClick={awardBonus}
            disabled={!bonusReason || !bonusAmount}
            className="w-full bg-yellow-400 text-slate-900 font-bold py-2 rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Award Bonus
          </button>
        </div>
      </div>

      {/* Sunday Payout */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Sunday Payout</h2>
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          {!isSunday && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPayoutOverride}
                  onChange={e => setAllowPayoutOverride(e.target.checked)}
                  className="rounded"
                />
                Override (today is not Sunday)
              </label>
            </div>
          )}
          {(isSunday || allowPayoutOverride) && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                Enter how much XP to convert. Remaining XP carries forward.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">XP → Dollars</label>
                  <input
                    type="number"
                    value={xpToDollars}
                    onChange={e => setXpToDollars(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-green-400 text-sm"
                    placeholder="e.g. 3000"
                    min="0"
                    step="1000"
                  />
                  <div className="text-xs text-green-400 mt-1">
                    = ${Math.floor((parseInt(xpToDollars) || 0) / 1000)}.00
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">XP → Screen Time</label>
                  <input
                    type="number"
                    value={xpToScreen}
                    onChange={e => setXpToScreen(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-400 text-sm"
                    placeholder="e.g. 2000"
                    min="0"
                    step="1000"
                  />
                  <div className="text-xs text-blue-400 mt-1">
                    = {Math.floor((parseInt(xpToScreen) || 0) / 1000) * 30} min
                  </div>
                </div>
              </div>
              <button
                onClick={runPayout}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-400 transition-colors"
              >
                Run Sunday Payout
              </button>
            </div>
          )}
          {!isSunday && !allowPayoutOverride && (
            <p className="text-slate-500 text-sm">
              Payout runs on Sundays. Check the override box to run now.
            </p>
          )}
        </div>
      </div>

      {/* Last payout result */}
      {payoutPreview && (
        <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 mb-6">
          <h3 className="text-green-400 font-bold mb-2">Payout Complete!</h3>
          <div className="text-sm text-slate-300 space-y-1">
            <div>Total XP this week: <strong>{String((payoutPreview as Record<string, unknown>).totalXp ?? '')}</strong></div>
            <div>Dollars earned: <strong>${Number((payoutPreview as Record<string, unknown>).dollarsEarned ?? 0).toFixed(2)}</strong></div>
            <div>Screen time earned: <strong>{String((payoutPreview as Record<string, unknown>).screenTimeEarnedMinutes ?? '')} min</strong></div>
            <div>Interest: <strong>${Number((payoutPreview as Record<string, unknown>).interestEarned ?? 0).toFixed(2)}</strong></div>
            <div>New balance: <strong>${Number((payoutPreview as Record<string, unknown>).newDollarBalance ?? 0).toFixed(2)}</strong></div>
            <div>XP carried forward: <strong>{String((payoutPreview as Record<string, unknown>).xpCarriedForward ?? '')}</strong></div>
          </div>
        </div>
      )}

      {/* Penalty confirm modal */}
      {pendingPenalty && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-red-700">
            <h3 className="text-white font-bold text-lg mb-2">Confirm Penalty</h3>
            <p className="text-slate-300 text-sm mb-1">{pendingPenalty.offense}</p>
            <p className="text-red-400 font-bold text-2xl mb-4">{pendingPenalty.xp} XP</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingPenalty(null)}
                className="flex-1 bg-slate-700 text-white py-3 rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyPenalty(pendingPenalty.offense, pendingPenalty.xp)}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
