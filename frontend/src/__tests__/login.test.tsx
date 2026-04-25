import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../api/auth'
import Login from '../pages/Login'
import { useAuthStore } from '../stores/auth'

vi.mock('../api/auth', () => ({
  login: vi.fn(),
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.getState().clearSession()
  })

  it('submits credentials and redirects after a successful login', async () => {
    vi.mocked(login).mockResolvedValue({
      token: 'test-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        created_at: 1,
        updated_at: 1,
      },
    })

    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<Login />} path="/login" />
          <Route element={<div>Home page</div>} path="/" />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/email/i), ' USER@example.com ')
    await user.type(screen.getByLabelText(/password/i), 'supersecret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'supersecret123',
      })
    })

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBe('test-token')
  })
})
