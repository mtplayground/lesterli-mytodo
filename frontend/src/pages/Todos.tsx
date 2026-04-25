import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientError } from '../api/client'
import {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
  type CreateTodoInput,
  type Todo,
  type UpdateTodoInput,
} from '../api/todos'
import TodoForm from '../components/TodoForm'
import TodoItem from '../components/TodoItem'
import { useAuthStore } from '../stores/auth'

const TODOS_QUERY_KEY = ['todos']

export default function Todos() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const user = useAuthStore((state) => state.user)

  const todosQuery = useQuery({
    queryKey: TODOS_QUERY_KEY,
    queryFn: listTodos,
  })

  const createMutation = useMutation<Todo, unknown, CreateTodoInput, { previousTodos: Todo[] }>({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onError: (error, _input, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(TODOS_QUERY_KEY, context.previousTodos)
      }

      setCreateError(toErrorMessage(error, 'Failed to create todo.'))
    },
    onMutate: async (input) => {
      setCreateError(null)
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY })

      const previousTodos = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY) ?? []
      const now = Math.floor(Date.now() / 1000)
      const optimisticTodo: Todo = {
        id: `optimistic-${now}`,
        user_id: user?.id ?? 'unknown-user',
        title: input.title,
        description: input.description,
        completed: false,
        created_at: now,
        updated_at: now,
      }

      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, [optimisticTodo, ...previousTodos])

      return { previousTodos }
    },
    onSuccess: async () => {
      setCreateError(null)
      await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ todo, input }: { todo: Todo; input: UpdateTodoInput }) =>
      updateTodo(todo.id, input),
    onError: (error) => {
      setActionError(toErrorMessage(error, 'Failed to update todo.'))
    },
    onMutate: () => {
      setActionError(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (todo: Todo) => deleteTodo(todo.id),
    onError: (error) => {
      setActionError(toErrorMessage(error, 'Failed to delete todo.'))
    },
    onMutate: () => {
      setActionError(null)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })
    },
  })

  const todos = todosQuery.data ?? []

  function handleToggle(todo: Todo) {
    toggleMutation.mutate({
      todo,
      input: {
        title: todo.title,
        description: todo.description,
        completed: !todo.completed,
      },
    })
  }

  function handleDelete(todo: Todo) {
    deleteMutation.mutate(todo)
  }

  async function handleCreate(input: CreateTodoInput) {
    await createMutation.mutateAsync(input)
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Todos</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Your current list</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              This page reads from the authenticated todo API and lets you toggle completion or
              remove items without leaving the list.
            </p>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => {
              void todosQuery.refetch()
            }}
            type="button"
          >
            Refresh list
          </button>
        </div>
      </div>

      <TodoForm
        error={createMutation.isPending ? null : createError}
        isSubmitting={createMutation.isPending}
        onSubmit={handleCreate}
      />

      {actionError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {todosQuery.isPending ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
          <p className="text-sm text-slate-600">Loading todos...</p>
        </section>
      ) : null}

      {todosQuery.isError ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-panel">
          <p className="text-sm font-medium text-red-700">Unable to load todos</p>
          <p className="mt-2 text-sm text-red-600">
            {toErrorMessage(todosQuery.error, 'Failed to fetch todos.')}
          </p>
        </section>
      ) : null}

      {!todosQuery.isPending && !todosQuery.isError && todos.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center shadow-panel">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">No Todos Yet</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Your list is empty.</h2>
          <p className="mt-3 text-sm text-slate-600">
            Add your first item with the form above and it will appear here immediately.
          </p>
        </section>
      ) : null}

      {!todosQuery.isPending && !todosQuery.isError && todos.length > 0 ? (
        <div className="space-y-4">
          {todos.map((todo) => (
            <TodoItem
              isDeleting={deleteMutation.isPending && deleteMutation.variables?.id === todo.id}
              isToggling={toggleMutation.isPending && toggleMutation.variables?.todo.id === todo.id}
              key={todo.id}
              onDelete={handleDelete}
              onToggle={handleToggle}
              todo={todo}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
