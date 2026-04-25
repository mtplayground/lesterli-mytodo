type EmptyStateProps = {
  eyebrow: string
  message: string
  title: string
}

export default function EmptyState({ eyebrow, message, title }: EmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center shadow-panel">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
    </section>
  )
}
