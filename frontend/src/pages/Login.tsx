import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { ApiClientError } from '../api/client'
import Toast from '../components/Toast'
import { useAuthStore } from '../stores/auth'

export default function Login() {
  const location = useLocation()
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const token = useAuthStore((state) => state.token)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = getRedirectPath(location.state)

  useEffect(() => {
    if (token) {
      navigate(redirectTo, { replace: true })
    }
  }, [navigate, redirectTo, token])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const session = await login({
        email: normalizedEmail,
        password,
      })

      setSession(session)
      navigate(redirectTo, { replace: true })
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-6 py-10 text-ink">
      {error ? (
        <Toast message={error} onDismiss={() => setError(null)} title="Login failed" />
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-gradient-to-br from-ink to-slate-900 p-8 text-white shadow-panel">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-200">Welcome Back</p>
          <h1 className="mt-4 text-4xl font-semibold">Sign in to keep your todos moving.</h1>
          <p className="mt-4 max-w-xl text-base text-slate-200">
            Use the account you created to access the app. Your token is stored locally and the
            frontend client will attach it automatically to authenticated API requests.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Need an account?</p>
            <p className="mt-2 text-sm text-slate-200">
              Create one on the registration page and you will be redirected back into the app
              immediately after success.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-panel">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Login</p>
            <h2 className="mt-2 text-3xl font-semibold">Account access</h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New here?{' '}
            <Link className="font-medium text-accent hover:text-teal-700" to="/register">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}

function isValidEmail(value: string): boolean {
  const parts = value.split('@')
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.')
}

function getRedirectPath(state: unknown): string {
  if (typeof state !== 'object' || state === null) {
    return '/'
  }

  const candidate = state as {
    from?: {
      pathname?: string
    }
  }

  return candidate.from?.pathname || '/'
}
