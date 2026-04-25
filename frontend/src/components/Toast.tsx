type ToastProps = {
  message: string
  onDismiss?: () => void
  title: string
  variant?: 'error' | 'success'
}

export default function Toast({ message, onDismiss, title, variant = 'error' }: ToastProps) {
  const classes =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
      <div className={`rounded-3xl border px-5 py-4 shadow-panel ${classes}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">{title}</p>
            <p className="mt-2 text-sm leading-6">{message}</p>
          </div>
          {onDismiss ? (
            <button
              className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium transition hover:bg-white/40"
              onClick={onDismiss}
              type="button"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
