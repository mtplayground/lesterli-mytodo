import type { TodoStatusFilter } from '../api/todos'

type FilterBarProps = {
  isSearching: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (status: TodoStatusFilter) => void
  searchValue: string
  status: TodoStatusFilter
}

const STATUS_OPTIONS: Array<{
  label: string
  value: TodoStatusFilter
}> = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

export default function FilterBar({
  isSearching,
  onSearchChange,
  onStatusChange,
  searchValue,
  status,
}: FilterBarProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Filters</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((option) => {
              const isActive = option.value === status

              return (
                <button
                  className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-accent bg-teal-50 text-accent'
                      : 'border-slate-300 text-slate-700 hover:border-accent hover:text-accent'
                  }`}
                  key={option.value}
                  onClick={() => onStatusChange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block min-w-0 lg:w-[24rem]">
          <span className="text-sm font-medium text-slate-700">Search todos</span>
          <div className="relative mt-2">
            <input
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 pr-28 text-base outline-none transition focus:border-accent focus:bg-white"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title or description"
              type="search"
              value={searchValue}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs uppercase tracking-[0.18em] text-slate-400">
              {isSearching ? 'Updating' : 'Live'}
            </span>
          </div>
        </label>
      </div>
    </section>
  )
}
