'use client'

import { useState } from 'react'

const CORRECT_PIN = '1234'

interface ParentPinModalProps {
  onSuccess: () => void
}

export default function ParentPinModal({ onSuccess }: ParentPinModalProps) {
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
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setPin('')
        if (newAttempts >= 3) {
          setError('Ask Mom or Dad')
        } else {
          setError(`Wrong PIN — ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} left`)
        }
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const digits = ['1','2','3','4','5','6','7','8','9','*','0','⌫']

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-xs mx-4 shadow-2xl">
        <h2 className="text-white text-xl font-bold text-center mb-2">Parent Mode</h2>
        <p className="text-slate-400 text-sm text-center mb-6">Enter PIN to continue</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? 'bg-yellow-400 border-yellow-400'
                  : 'bg-transparent border-slate-500'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Keypad */}
        {attempts < 3 && (
          <div className="grid grid-cols-3 gap-3">
            {digits.map((digit) => (
              <button
                key={digit}
                onClick={() => {
                  if (digit === '⌫') handleDelete()
                  else if (digit !== '*') handleDigit(digit)
                }}
                className={`
                  h-16 rounded-xl text-2xl font-bold transition-all active:scale-95
                  ${digit === '*'
                    ? 'opacity-0 pointer-events-none'
                    : digit === '⌫'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-700 text-white hover:bg-slate-600 active:bg-yellow-500'
                  }
                `}
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
