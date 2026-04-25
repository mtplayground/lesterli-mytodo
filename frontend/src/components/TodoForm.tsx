import { FormEvent, useEffect, useState } from 'react'
import type { CreateTodoInput } from '../api/todos'

type TodoFormMode = 'create' | 'edit'

type TodoFormProps = {
  completed?: boolean
  error?: string | null
  initialValue?: CreateTodoInput
  isSubmitting: boolean
  isToggling?: boolean
  mode?: TodoFormMode
  onCancel?: () => void
  onSubmit: (input: CreateTodoInput) => Promise<void>
  onToggleCompleted?: () => void
}

export default function TodoForm({
  completed = false,
  error,
  initialValue,
  isSubmitting,
  isToggling = false,
  mode = 'create',
  onCancel,
  onSubmit,
  onToggleCompleted,
}: TodoFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const isEditMode = mode === 'edit'
  const isBusy = isSubmitting || isToggling

  useEffect(() => {
    setTitle(initialValue?.title ?? '')
    setDescription(initialValue?.description ?? '')
    setValidationError(null)
  }, [initialValue?.description, initialValue?.title, mode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedTitle = title.trim()
    const normalizedDescription = normalizeDescription(description)

    if (!normalizedTitle) {
      setValidationError('Title is required.')
      return
    }

    setValidationError(null)

    try {
      await onSubmit({
        title: normalizedTitle,
        description: normalizedDescription,
      })

      if (!isEditMode) {
        setTitle('')
        setDescription('')
      }
    } catch {
      // The parent mutation surfaces request errors in its shared error banner.
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            {isEditMode ? 'Todo Details' : 'Create Todo'}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            {isEditMode ? 'Edit selected todo' : 'Add something new'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            {isEditMode
              ? 'Adjust the title or description, then save without leaving the list.'
              : 'New items appear in the list immediately while the request is in flight.'}
          </p>
        </div>

        {isEditMode && onToggleCompleted ? (
          <button
            className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              completed
                ? 'border border-slate-300 bg-white text-slate-700 hover:border-accent hover:text-accent'
                : 'bg-ink text-white hover:bg-slate-800'
            }`}
            disabled={isBusy}
            onClick={onToggleCompleted}
            type="button"
          >
            {isToggling ? 'Updating status...' : completed ? 'Mark active' : 'Mark done'}
          </button>
        ) : null}
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
            disabled={isBusy}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
            type="text"
            value={title}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
            disabled={isBusy}
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional details"
            value={description}
          />
        </label>

        {validationError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {validationError}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            type="submit"
          >
            {isSubmitting
              ? isEditMode
                ? 'Saving changes...'
                : 'Adding todo...'
              : isEditMode
                ? 'Save changes'
                : 'Add todo'}
          </button>

          {isEditMode && onCancel ? (
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBusy}
              onClick={onCancel}
              type="button"
            >
              Close details
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}

function normalizeDescription(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized : null
}
