type LoadingStateProps = {
  label: string
}

export default function LoadingState({ label }: LoadingStateProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
      <div className="flex items-center gap-4">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-accent" />
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </section>
  )
}
