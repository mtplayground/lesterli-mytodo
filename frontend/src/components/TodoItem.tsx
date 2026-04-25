import type { Todo } from '../api/todos'

type TodoItemProps = {
  isDeleting: boolean
  isToggling: boolean
  onDelete: (todo: Todo) => void
  onToggle: (todo: Todo) => void
  todo: Todo
}

export default function TodoItem({
  isDeleting,
  isToggling,
  onDelete,
  onToggle,
  todo,
}: TodoItemProps) {
  const timestamp = new Date(todo.updated_at * 1000).toLocaleString()

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <button
              aria-label={todo.completed ? 'Mark todo as incomplete' : 'Mark todo as complete'}
              className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                todo.completed
                  ? 'border-teal-700 bg-accent text-white'
                  : 'border-slate-300 bg-white text-transparent hover:border-accent'
              }`}
              disabled={isToggling || isDeleting}
              onClick={() => onToggle(todo)}
              type="button"
            >
              ✓
            </button>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                {todo.completed ? 'Completed' : 'Active'}
              </p>
              <h3
                className={`mt-2 text-xl font-semibold ${
                  todo.completed ? 'text-slate-400 line-through' : 'text-ink'
                }`}
              >
                {todo.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500">Last updated {timestamp}</p>
              {todo.description ? (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {todo.description}
                </p>
              ) : (
                <p className="mt-4 text-sm italic text-slate-400">No description</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isToggling || isDeleting}
            onClick={() => onToggle(todo)}
            type="button"
          >
            {isToggling ? 'Saving...' : todo.completed ? 'Mark active' : 'Mark done'}
          </button>
          <button
            className="inline-flex items-center rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting || isToggling}
            onClick={() => onDelete(todo)}
            type="button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  )
}
