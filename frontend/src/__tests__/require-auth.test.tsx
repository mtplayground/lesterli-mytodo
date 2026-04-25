import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import RequireAuth from '../components/RequireAuth'
import { useAuthStore } from '../stores/auth'

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession()
  })

  it('redirects unauthenticated users to the login route', async () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<div>Protected page</div>} path="/protected" />
          </Route>
          <Route element={<div>Login page</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected page')).not.toBeInTheDocument()
  })
})
