import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listTodos } from '../api/todos'
import Todos from '../pages/Todos'
import { useAuthStore } from '../stores/auth'

vi.mock('../api/todos', async () => {
  const actual = await vi.importActual<typeof import('../api/todos')>('../api/todos')

  return {
    ...actual,
    createTodo: vi.fn(),
    deleteTodo: vi.fn(),
    listTodos: vi.fn(),
    updateTodo: vi.fn(),
  }
})

describe('Todos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: 'test-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        created_at: 1,
        updated_at: 1,
      },
    })
  })

  it('renders todos returned by the list query', async () => {
    vi.mocked(listTodos).mockResolvedValue([
      {
        id: 'todo-1',
        user_id: 'user-1',
        title: 'Buy milk',
        description: '2 liters',
        completed: false,
        created_at: 1,
        updated_at: 1,
      },
      {
        id: 'todo-2',
        user_id: 'user-1',
        title: 'Read docs',
        description: null,
        completed: true,
        created_at: 2,
        updated_at: 2,
      },
    ])

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Todos />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Read docs')).toBeInTheDocument()
    expect(screen.getByText('2 liters')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
  })
})
