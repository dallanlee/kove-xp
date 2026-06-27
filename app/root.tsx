import {
  data,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import type { LinksFunction, LoaderFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/auth'
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

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const role = getRole(user)
  return data({ isParent: role === 'parent', isLoggedIn: !!user }, { headers })
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
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

function NavItem({ to, icon, label, end }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-1 px-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`
      }
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </NavLink>
  )
}

export default function App() {
  const { isParent, isLoggedIn } = useLoaderData<typeof loader>()

  return (
    <>
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {isLoggedIn && (
        <nav
          className="fixed bottom-0 left-0 right-0 border-t z-50"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-around py-2 max-w-lg mx-auto">
            <NavItem to="/" icon="📋" label="Today" end />
            <NavItem to="/weekly" icon="🔥" label="Weekly" />
            <NavItem to="/bank" icon="💰" label="Bank" />
            <NavItem to="/history" icon="📅" label="History" />
            {isParent && <NavItem to="/parent" icon="🔒" label="Parent" />}
          </div>
        </nav>
      )}
    </>
  )
}
