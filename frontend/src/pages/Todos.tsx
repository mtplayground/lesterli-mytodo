import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ApiClientError } from '../api/client'
import {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
  type CreateTodoInput,
  type ListTodosFilters,
  type Todo,
  type TodoStatusFilter,
  type UpdateTodoInput,
} from '../api/todos'
import FilterBar from '../components/FilterBar'
import TodoForm from '../components/TodoForm'
import TodoItem from '../components/TodoItem'
import { useAuthStore } from '../stores/auth'

const DEBOUNCE_MS = 250
const TODOS_QUERY_KEY = ['todos'] as const

export default function Todos() {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TodoStatusFilter>('all')
  const user = useAuthStore((state) => state.user)
  const normalizedSearch = debouncedSearch.trim()
  const currentListFilters: ListTodosFilters = {
    q: normalizedSearch || undefined,
    status: statusFilter,
  }
  const currentTodosQueryKey = [...TODOS_QUERY_KEY, statusFilter, normalizedSearch] as const

  const todosQuery = useQuery({
    queryKey: currentTodosQueryKey,
    queryFn: () => listTodos(currentListFilters),
  })

  const createMutation = useMutation<Todo, unknown, CreateTodoInput, { previousTodos: Todo[] }>({
    mutationFn: (input: CreateTodoInput) => createTodo(input),
    onError: (error, _input, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(currentTodosQueryKey, context.previousTodos)
      }

      setCreateError(toErrorMessage(error, 'Failed to create todo.'))
    },
    onMutate: async (input) => {
      setCreateError(null)
      await queryClient.cancelQueries({ queryKey: currentTodosQueryKey })

      const previousTodos = queryClient.getQueryData<Todo[]>(currentTodosQueryKey) ?? []
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

      queryClient.setQueryData<Todo[]>(
        currentTodosQueryKey,
        matchesFilters(optimisticTodo, statusFilter, normalizedSearch)
          ? [optimisticTodo, ...previousTodos]
          : previousTodos,
      )

      return { previousTodos }
    },
    onSuccess: async () => {
      setCreateError(null)
      await queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      todo,
      input,
    }: {
      source: 'detail' | 'list'
      todo: Todo
      input: UpdateTodoInput
    }) => updateTodo(todo.id, input),
    onError: (error, variables) => {
      const message = toErrorMessage(error, 'Failed to update todo.')

      if (variables.source === 'detail') {
        setEditError(message)
      } else {
        setActionError(message)
      }
    },
    onMutate: (variables) => {
      if (variables.source === 'detail') {
        setEditError(null)
      } else {
        setActionError(null)
      }
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
  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId) ?? null

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchInput])

  useEffect(() => {
    if (selectedTodoId && !selectedTodo) {
      setSelectedTodoId(null)
      setEditError(null)
    }
  }, [selectedTodo, selectedTodoId])

  function handleToggle(todo: Todo) {
    updateMutation.mutate({
      source: 'list',
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

  async function handleUpdate(input: CreateTodoInput) {
    if (!selectedTodo) {
      return
    }

    await updateMutation.mutateAsync({
      source: 'detail',
      todo: selectedTodo,
      input: {
        title: input.title,
        description: input.description,
        completed: selectedTodo.completed,
      },
    })
  }

  function handleSelect(todo: Todo) {
    setEditError(null)
    setSelectedTodoId(todo.id)
  }

  function handleCloseDetails() {
    setEditError(null)
    setSelectedTodoId(null)
  }

  function handleToggleFromDetails() {
    if (!selectedTodo) {
      return
    }

    updateMutation.mutate({
      source: 'detail',
      todo: selectedTodo,
      input: {
        title: selectedTodo.title,
        description: selectedTodo.description,
        completed: !selectedTodo.completed,
      },
    })
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TodoForm
          error={createMutation.isPending ? null : createError}
          isSubmitting={createMutation.isPending}
          onSubmit={handleCreate}
        />

        {selectedTodo ? (
          <TodoForm
            completed={selectedTodo.completed}
            error={updateMutation.isPending ? null : editError}
            initialValue={{
              title: selectedTodo.title,
              description: selectedTodo.description,
            }}
            isSubmitting={updateMutation.isPending}
            isToggling={updateMutation.isPending}
            mode="edit"
            onCancel={handleCloseDetails}
            onSubmit={handleUpdate}
            onToggleCompleted={handleToggleFromDetails}
          />
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 shadow-panel">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Todo Details</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Select an item to edit</h2>
            <p className="mt-3 text-sm text-slate-600">
              Choose any todo from the list below to update its title, description, or completion
              status in the detail panel.
            </p>
          </section>
        )}
      </div>

      <FilterBar
        isSearching={searchInput !== debouncedSearch}
        onSearchChange={setSearchInput}
        onStatusChange={setStatusFilter}
        searchValue={searchInput}
        status={statusFilter}
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
          <h2 className="mt-3 text-2xl font-semibold text-ink">
            {hasActiveFilters(statusFilter, normalizedSearch)
              ? 'No todos match the current filters.'
              : 'Your list is empty.'}
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            {hasActiveFilters(statusFilter, normalizedSearch)
              ? 'Try a different status tab or broaden the search input.'
              : 'Add your first item with the form above and it will appear here immediately.'}
          </p>
        </section>
      ) : null}

      {!todosQuery.isPending && !todosQuery.isError && todos.length > 0 ? (
        <div className="space-y-4">
          {todos.map((todo) => (
            <TodoItem
              isDeleting={deleteMutation.isPending && deleteMutation.variables?.id === todo.id}
              isSelected={selectedTodoId === todo.id}
              isToggling={updateMutation.isPending && updateMutation.variables?.todo.id === todo.id}
              key={todo.id}
              onDelete={handleDelete}
              onSelect={handleSelect}
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

function hasActiveFilters(status: TodoStatusFilter, query: string): boolean {
  return status !== 'all' || query.length > 0
}

function matchesFilters(todo: Todo, status: TodoStatusFilter, query: string): boolean {
  if (status === 'active' && todo.completed) {
    return false
  }

  if (status === 'completed' && !todo.completed) {
    return false
  }

  if (!query) {
    return true
  }

  const haystack = `${todo.title}\n${todo.description ?? ''}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}
