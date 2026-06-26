import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kove XP',
  description: 'Gamified allowance tracker for the Clawson family',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-slate-900 text-white`}>
        <main className="flex-1 pb-20">
          {children}
        </main>

        {/* Bottom nav bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50">
          <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
            <Link
              href="/"
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-4"
            >
              <span className="text-2xl">📋</span>
              <span className="text-xs">Today</span>
            </Link>
            <Link
              href="/weekly"
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-4"
            >
              <span className="text-2xl">🔥</span>
              <span className="text-xs">Weekly</span>
            </Link>
            <Link
              href="/bank"
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-4"
            >
              <span className="text-2xl">💰</span>
              <span className="text-xs">Bank</span>
            </Link>
            <Link
              href="/parent"
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition-colors py-1 px-4"
            >
              <span className="text-2xl">🔒</span>
              <span className="text-xs">Parent</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  )
}
