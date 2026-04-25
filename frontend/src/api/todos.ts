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

export type UpdateTodoInput = {
  title: string
  description: string | null
  completed: boolean
}

export function createTodo(input: CreateTodoInput): Promise<Todo> {
  return apiClient.post<Todo>('/api/todos', {
    body: input,
  })
}

export function listTodos(): Promise<Todo[]> {
  return apiClient.get<Todo[]>('/api/todos')
}

export function updateTodo(todoId: string, input: UpdateTodoInput): Promise<Todo> {
  return apiClient.put<Todo>(`/api/todos/${todoId}`, {
    body: input,
  })
}

export async function deleteTodo(todoId: string): Promise<void> {
  await apiClient.delete<null>(`/api/todos/${todoId}`)
}
