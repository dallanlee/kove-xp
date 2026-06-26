import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router'
import type { LinksFunction } from 'react-router'
import stylesheet from './app.css?url'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
]

export function meta() {
  return [
    { title: 'Kove' },
    { name: 'description', content: 'Gamified allowance tracker for the Clawson family' },
  ]
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <main className="flex-1 pb-20">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 border-t z-50"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
              }
            >
              <span className="text-2xl">📋</span>
              <span className="text-xs">Today</span>
            </NavLink>
            <NavLink
              to="/weekly"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
              }
            >
              <span className="text-2xl">🔥</span>
              <span className="text-xs">Weekly</span>
            </NavLink>
            <NavLink
              to="/bank"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
              }
            >
              <span className="text-2xl">💰</span>
              <span className="text-xs">Bank</span>
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
              }
            >
              <span className="text-2xl">📅</span>
              <span className="text-xs">History</span>
            </NavLink>
            <NavLink
              to="/parent"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
              }
            >
              <span className="text-2xl">🔒</span>
              <span className="text-xs">Parent</span>
            </NavLink>
          </div>
        </nav>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
