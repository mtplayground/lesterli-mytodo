import { FormEvent, useState } from 'react'
import type { CreateTodoInput } from '../api/todos'

type TodoFormProps = {
  error?: string | null
  isSubmitting: boolean
  onSubmit: (input: CreateTodoInput) => Promise<void>
}

export default function TodoForm({ error, isSubmitting, onSubmit }: TodoFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

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

      setTitle('')
      setDescription('')
    } catch {
      // The parent mutation surfaces request errors in its shared error banner.
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Create Todo</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Add something new</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            New items appear in the list immediately while the request is in flight.
          </p>
        </div>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-accent focus:bg-white"
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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

        <button
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Adding todo...' : 'Add todo'}
        </button>
      </form>
    </section>
  )
}

function normalizeDescription(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized : null
}
