import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { create } from 'zustand'
import Header from './components/Header'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import { useAuthStore } from './stores/auth'

type HealthResponse = {
  status: string
}

type FrontendState = {
  apiBaseUrl: string
  healthPath: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')

const useFrontendState = create<FrontendState>(() => ({
  apiBaseUrl,
  healthPath: `${apiBaseUrl}/health`,
}))

async function fetchHealth(path: string): Promise<HealthResponse> {
  const response = await fetch(path, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}

function HealthPage() {
  const user = useAuthStore((state) => state.user)
  const configuredApiBaseUrl = useFrontendState((state) => state.apiBaseUrl)
  const healthPath = useFrontendState((state) => state.healthPath)
  const healthQuery = useQuery({
    queryKey: ['health', healthPath],
    queryFn: () => fetchHealth(healthPath),
    retry: false,
  })

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Health Check</p>
          <h2 className="mt-2 text-2xl font-semibold">Backend status</h2>
          <p className="mt-2 text-sm text-slate-600">
            API base URL:{' '}
            <code className="rounded bg-slate-100 px-2 py-1">
              {configuredApiBaseUrl || '(same origin)'}
            </code>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Query target: <code className="rounded bg-slate-100 px-2 py-1">{healthPath}</code>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Session:{' '}
            <code className="rounded bg-slate-100 px-2 py-1">
              {user ? user.email : 'anonymous'}
            </code>
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          onClick={() => {
            void healthQuery.refetch()
          }}
          type="button"
        >
          Refresh health
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        {healthQuery.isPending ? (
          <p className="text-sm text-slate-600">Checking backend health...</p>
        ) : null}

        {healthQuery.isError ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700">Health check failed</p>
            <p className="text-sm text-red-600">{healthQuery.error.message}</p>
          </div>
        ) : null}

        {healthQuery.data ? (
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Response
            </p>
            <p className="text-3xl font-semibold text-accent">{healthQuery.data.status}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ProtectedLayout() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-10 text-ink">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Header />
        <Outlet />
      </div>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Login />} path="/login" />
      <Route element={<Register />} path="/register" />
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          <Route element={<HealthPage />} path="/" />
        </Route>
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}
