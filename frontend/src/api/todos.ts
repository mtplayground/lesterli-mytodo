import { apiClient } from './client'

export type Todo = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  created_at: number
  updated_at: number
}

export type CreateTodoInput = {
  title: string
  description: string | null
}

export type TodoStatusFilter = 'active' | 'all' | 'completed'

export type UpdateTodoInput = {
  title: string
  description: string | null
  completed: boolean
}

export type ListTodosFilters = {
  q?: string
  status?: TodoStatusFilter
}

export function createTodo(input: CreateTodoInput): Promise<Todo> {
  return apiClient.post<Todo>('/api/todos', {
    body: input,
  })
}

export function listTodos(filters: ListTodosFilters = {}): Promise<Todo[]> {
  const searchParams = new URLSearchParams()

  if (filters.status && filters.status !== 'all') {
    searchParams.set('status', filters.status)
  }

  if (filters.q) {
    searchParams.set('q', filters.q)
  }

  const queryString = searchParams.toString()
  const path = queryString ? `/api/todos?${queryString}` : '/api/todos'

  return apiClient.get<Todo[]>(path)
}

export function updateTodo(todoId: string, input: UpdateTodoInput): Promise<Todo> {
  return apiClient.put<Todo>(`/api/todos/${todoId}`, {
    body: input,
  })
}

export async function deleteTodo(todoId: string): Promise<void> {
  await apiClient.delete<null>(`/api/todos/${todoId}`)
}
