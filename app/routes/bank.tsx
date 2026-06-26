import { data, redirect, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Payout } from '@/types/database'

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw redirect('/login')

  const [{ data: family }, { data: payouts }] = await Promise.all([
    supabase.from('families').select('dollar_balance, screen_time_minutes, xp_balance').single(),
    supabase.from('payouts').select('*').order('created_at', { ascending: false }).limit(8),
  ])

  return data({ family, payouts: payouts as Payout[] | null }, { headers })
}

export default function BankPage() {
  const { family, payouts } = useLoaderData<typeof loader>()

  const xpBalance = family?.xp_balance ?? 0
  const xpProgress = xpBalance % 1000
  const progressPercent = Math.min((xpProgress / 1000) * 100, 100)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-slate-300 mb-6">💰 Bank</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Dollar Balance</div>
          <div className="text-4xl font-bold text-green-400">
            ${Number(family?.dollar_balance ?? 0).toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">10% interest each Sunday</div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="text-xs text-slate-400 mb-1">Screen Time Bank</div>
          <div className="text-4xl font-bold text-blue-400">
            {formatMinutes(family?.screen_time_minutes ?? 0)}
          </div>
          <div className="text-xs text-blue-600 mt-1">accumulated screen time</div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-xs text-slate-400">Carried Points</div>
            <div className="text-2xl font-bold text-blue-400">
              {xpBalance.toLocaleString()} pts
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Next $1</div>
            <div className="text-lg font-bold text-blue-300">
              {xpProgress.toLocaleString()} / 1,000
            </div>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          1,000 pts = $1 · 1,000 pts = 30 min screen time
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Payout History
        </h2>
        {!payouts || payouts.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 text-slate-500 text-sm">
            No payouts yet — first payout happens on Sunday.
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(payout => (
              <div key={payout.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-xs text-slate-400">Week of {payout.week_start}</div>
                    <div className="text-sm font-bold text-white">
                      {payout.total_xp.toLocaleString()} pts earned
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">${Number(payout.dollars_earned).toFixed(2)}</div>
                    <div className="text-blue-400 text-sm">{formatMinutes(payout.screen_time_earned_minutes)}</div>
                  </div>
                </div>
                {(payout.interest_earned > 0 || payout.perfect_week_bonus_xp > 0) && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {payout.interest_earned > 0 && (
                      <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                        +${Number(payout.interest_earned).toFixed(2)} interest
                      </span>
                    )}
                    {payout.perfect_week_bonus_xp > 0 && (
                      <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                        Perfect week bonus!
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
