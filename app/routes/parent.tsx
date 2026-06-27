import { data, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState, useEffect } from 'react'
import { requireParent } from '@/lib/auth'
import { getTodayMT } from '@/lib/date'
import { runSundayPayout } from '@/lib/payout'

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

export async function loader({ request }: LoaderFunctionArgs) {
  const { headers } = await requireParent(request)
  const today = getTodayMT()
  const isSunday = new Date(today + 'T12:00:00').getDay() === 0
  return data({ isSunday }, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = await requireParent(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  const today = getTodayMT()

  if (intent === 'apply-penalty') {
    const offense = formData.get('offense') as string
    const xp_delta = parseInt(formData.get('xp_delta') as string)
    if (!offense || isNaN(xp_delta)) return data({ error: 'Missing params' }, { status: 400, headers })

    const { error } = await supabase.from('xp_events').insert({
      xp_delta: xp_delta < 0 ? xp_delta : -Math.abs(xp_delta),
      reason: offense,
      event_type: 'penalty',
      task_id: null,
      event_date: today,
      actor: 'parent',
    })
    if (error) return data({ error: error.message }, { status: 500, headers })
    return data({ success: true, toast: `Penalty applied: ${offense} (${xp_delta} pts)` }, { headers })

  } else if (intent === 'award-bonus') {
    const reason = formData.get('reason') as string
    const xp_delta = parseInt(formData.get('xp_delta') as string)
    if (!reason || isNaN(xp_delta)) return data({ error: 'Missing params' }, { status: 400, headers })

    const { error } = await supabase.from('xp_events').insert({
      xp_delta: Math.abs(xp_delta),
      reason,
      event_type: 'bonus_award',
      task_id: null,
      event_date: today,
      actor: 'parent',
    })
    if (error) return data({ error: error.message }, { status: 500, headers })
    return data({ success: true, toast: `Bonus awarded: ${reason} (+${xp_delta} pts)` }, { headers })

  } else if (intent === 'sunday-payout') {
    const xp_to_dollars = parseInt(formData.get('xp_to_dollars') as string) || 0
    const xp_to_screen_time = parseInt(formData.get('xp_to_screen_time') as string) || 0
    try {
      const summary = await runSundayPayout(supabase, xp_to_dollars, xp_to_screen_time)
      return data({ success: true, toast: 'Payout complete!', payout: summary }, { headers })
    } catch (e) {
      return data({ error: String(e) }, { status: 500, headers })
    }
  }

  return data({ error: 'Unknown intent' }, { status: 400, headers })
}

const CORRECT_PIN = '1234'

function PinModal({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState('')

  function handleDigit(digit: string) {
    if (attempts >= 3) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        setError('')
        onSuccess()
      } else {
        const next = attempts + 1
        setAttempts(next)
        setPin('')
        setError(next >= 3 ? 'Ask Mom or Dad' : `Wrong PIN — ${3 - next} attempt${3 - next !== 1 ? 's' : ''} left`)
      }
    }
  }

  const digits = ['1','2','3','4','5','6','7','8','9','*','0','⌫']

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-xs mx-4 shadow-2xl">
        <h2 className="text-white text-xl font-bold text-center mb-2">Parent Mode</h2>
        <p className="text-slate-400 text-sm text-center mb-6">Enter PIN to continue</p>
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length ? 'bg-blue-400 border-blue-400' : 'bg-transparent border-slate-500'
            }`} />
          ))}
        </div>
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
        {attempts < 3 && (
          <div className="grid grid-cols-3 gap-3">
            {digits.map(digit => (
              <button
                key={digit}
                onClick={() => {
                  if (digit === '⌫') setPin(p => p.slice(0, -1))
                  else if (digit !== '*') handleDigit(digit)
                }}
                className={`h-16 rounded-xl text-2xl font-bold transition-all active:scale-95 ${
                  digit === '*' ? 'opacity-0 pointer-events-none' :
                  digit === '⌫' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' :
                  'bg-slate-700 text-white hover:bg-slate-600 active:bg-blue-600'
                }`}
              >
                {digit}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParentPage() {
  const { isSunday } = useLoaderData<typeof loader>()
  const [toast, setToast] = useState<string | null>(null)
  const [pendingPenalty, setPendingPenalty] = useState<typeof PENALTIES[0] | null>(null)
  const [allowPayoutOverride, setAllowPayoutOverride] = useState(false)

  const penaltyFetcher = useFetcher<{ success?: boolean; toast?: string; error?: string }>()
  const bonusFetcher = useFetcher<{ success?: boolean; toast?: string; error?: string }>()
  const payoutFetcher = useFetcher<{ success?: boolean; toast?: string; payout?: Record<string, unknown>; error?: string }>()

  // Show toasts from action responses
  useEffect(() => {
    if (penaltyFetcher.data?.toast) {
      setToast(penaltyFetcher.data.toast)
      setPendingPenalty(null)
      setTimeout(() => setToast(null), 3000)
    }
  }, [penaltyFetcher.data])

  useEffect(() => {
    if (bonusFetcher.data?.toast) {
      setToast(bonusFetcher.data.toast)
      setTimeout(() => setToast(null), 3000)
    }
  }, [bonusFetcher.data])

  useEffect(() => {
    if (payoutFetcher.data?.toast) {
      setToast(payoutFetcher.data.toast)
      setTimeout(() => setToast(null), 3000)
    }
  }, [payoutFetcher.data])

  const [xpToDollars, setXpToDollars] = useState('')
  const [xpToScreen, setXpToScreen] = useState('')


  const payoutResult = payoutFetcher.data?.payout

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-300 mb-6">🔒 Parent Mode</h1>

      {toast && (
        <div className="fixed top-4 left-0 right-0 mx-auto max-w-sm px-4 z-50">
          <div className="bg-slate-700 text-white px-4 py-3 rounded-xl shadow-lg text-sm text-center">
            {toast}
          </div>
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
              <span className="text-red-400 font-bold text-sm ml-2">{p.xp} pts</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bonus */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Award Bonus Points</h2>
        <bonusFetcher.Form method="post" className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
          <input type="hidden" name="intent" value="award-bonus" />
          <div>
            <label className="text-xs text-slate-400 block mb-1">Reason</label>
            <input
              type="text"
              name="reason"
              required
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-400 text-sm"
              placeholder="e.g. Helped with dishes unprompted"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Points Amount</label>
            <input
              type="number"
              name="xp_delta"
              required
              min="1"
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 focus:outline-none focus:border-blue-400 text-sm"
              placeholder="e.g. 100"
            />
          </div>
          <button
            type="submit"
            disabled={bonusFetcher.state !== 'idle'}
            className="w-full bg-blue-500 text-white font-bold py-2 rounded-xl hover:bg-blue-400 transition-colors disabled:opacity-50"
          >
            {bonusFetcher.state !== 'idle' ? 'Awarding…' : 'Award Bonus'}
          </button>
        </bonusFetcher.Form>
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
            <payoutFetcher.Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="sunday-payout" />
              <p className="text-sm text-slate-400">Enter how much to convert. Remaining pts carry forward.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Pts → Dollars</label>
                  <input
                    type="number"
                    name="xp_to_dollars"
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
                  <label className="text-xs text-slate-400 block mb-1">Pts → Screen Time</label>
                  <input
                    type="number"
                    name="xp_to_screen_time"
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
                type="submit"
                disabled={payoutFetcher.state !== 'idle'}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {payoutFetcher.state !== 'idle' ? 'Running…' : 'Run Sunday Payout'}
              </button>
            </payoutFetcher.Form>
          )}
          {!isSunday && !allowPayoutOverride && (
            <p className="text-slate-500 text-sm">Payout runs on Sundays. Check the override to run now.</p>
          )}
        </div>
      </div>

      {/* Last payout result */}
      {payoutResult && (
        <div className="bg-green-900/30 border border-green-700 rounded-2xl p-4 mb-6">
          <h3 className="text-green-400 font-bold mb-2">Payout Complete!</h3>
          <div className="text-sm text-slate-300 space-y-1">
            <div>Total pts this week: <strong>{String(payoutResult.totalXp ?? '')}</strong></div>
            <div>Dollars earned: <strong>${Number(payoutResult.dollarsEarned ?? 0).toFixed(2)}</strong></div>
            <div>Screen time earned: <strong>{String(payoutResult.screenTimeEarnedMinutes ?? '')} min</strong></div>
            <div>Interest: <strong>${Number(payoutResult.interestEarned ?? 0).toFixed(2)}</strong></div>
            <div>New balance: <strong>${Number(payoutResult.newDollarBalance ?? 0).toFixed(2)}</strong></div>
            <div>Pts carried forward: <strong>{String(payoutResult.xpCarriedForward ?? '')}</strong></div>
          </div>
        </div>
      )}

      {/* Penalty confirm modal */}
      {pendingPenalty && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-red-700">
            <h3 className="text-white font-bold text-lg mb-2">Confirm Penalty</h3>
            <p className="text-slate-300 text-sm mb-1">{pendingPenalty.offense}</p>
            <p className="text-red-400 font-bold text-2xl mb-4">{pendingPenalty.xp} pts</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingPenalty(null)}
                className="flex-1 bg-slate-700 text-white py-3 rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <penaltyFetcher.Form method="post" className="flex-1">
                <input type="hidden" name="intent" value="apply-penalty" />
                <input type="hidden" name="offense" value={pendingPenalty.offense} />
                <input type="hidden" name="xp_delta" value={pendingPenalty.xp} />
                <button
                  type="submit"
                  disabled={penaltyFetcher.state !== 'idle'}
                  className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </penaltyFetcher.Form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
