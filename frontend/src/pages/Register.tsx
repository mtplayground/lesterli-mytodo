import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { ApiClientError } from '../api/client'
import Toast from '../components/Toast'
import { useAuthStore } from '../stores/auth'

const MIN_PASSWORD_LENGTH = 8

export default function Register() {
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const session = await register({
        email: normalizedEmail,
        password,
      })

      setSession(session)
      navigate(redirectTo, { replace: true })
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        setError(caughtError.message)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-6 py-10 text-ink">
      {error ? (
        <Toast message={error} onDismiss={() => setError(null)} title="Registration failed" />
      ) : null}
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-panel">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Register</p>
            <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
            <p className="mt-3 text-sm text-slate-600">
              Registration stores your session locally so you can move directly into the app after
              signup.
            </p>
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
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                type="password"
                value={password}
              />
            </label>

            <button
              className="inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already registered?{' '}
            <Link className="font-medium text-accent hover:text-teal-700" to="/login">
              Sign in
            </Link>
          </p>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-br from-accent to-teal-900 p-8 text-white shadow-panel">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-100">Fast Start</p>
          <h2 className="mt-4 text-4xl font-semibold">Set up once and stay signed in.</h2>
          <p className="mt-4 max-w-xl text-base text-teal-50">
            The frontend auth store persists your token and user snapshot in local storage. Future
            authenticated API calls automatically reuse that token through the shared client.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-teal-100">Validation</p>
              <p className="mt-2 text-sm text-teal-50">
                Email format and password length are checked before the request is sent.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-teal-100">Redirect</p>
              <p className="mt-2 text-sm text-teal-50">
                Successful signup returns you to the app immediately with an active session.
              </p>
            </div>
          </div>
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
