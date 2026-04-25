import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export default function RequireAuth() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!token) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
