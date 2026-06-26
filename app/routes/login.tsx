import { data, redirect, useActionData, Form, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) throw redirect('/', { headers })
  return data({}, { headers })
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const formData = await request.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return data({ error: error.message }, { headers })
  }
  return redirect('/', { headers })
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const loading = navigation.state === 'submitting'

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⭐</div>
          <h1 className="text-3xl font-bold text-white">Kove</h1>
          <p className="text-slate-400 text-sm mt-1">Clawson Family</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
          <Form method="post" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {actionData?.error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
                {actionData.error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-400 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </Form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Family account — contact Dallan or Jordi for access.
        </p>
      </div>
    </div>
  )
}
