import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function Header() {
  const clearSession = useAuthStore((state) => state.clearSession)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-teal-900 p-8 text-white shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-teal-100">Authenticated Area</p>
          <h1 className="mt-3 text-4xl font-semibold">lesterli-mytodo</h1>
          <p className="mt-4 max-w-2xl text-base text-teal-50">
            Protected routes now require a valid session. Your token stays in local storage until
            you explicitly log out.
          </p>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-sm">
          <p className="uppercase tracking-[0.2em] text-teal-100">Signed in as</p>
          <p className="mt-2 break-all text-base font-medium text-white">
            {user?.email ?? 'Unknown user'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <NavLink
          className={({ isActive }) =>
            `inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-white bg-white text-ink'
                : 'border-white/20 text-white hover:bg-white/10'
            }`
          }
          to="/todos"
        >
          Todos
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            `inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-white bg-white text-ink'
                : 'border-white/20 text-white hover:bg-white/10'
            }`
          }
          to="/health"
        >
          Health
        </NavLink>
        <button
          className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-slate-100"
          onClick={handleLogout}
          type="button"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
