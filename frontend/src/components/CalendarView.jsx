import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, startOfMonth, getDay, getDaysInMonth, addMonths, subMonths, parseISO } from 'date-fns'
import { getCalendar, markTodoDone } from '../api.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoMonth(d) {
  return format(d, 'yyyy-MM')
}

export default function CalendarView({ refreshKey, onEventCreate, onEventEdit, onTodoEdit }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const monthParam = searchParams.get('month') || isoMonth(new Date())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCalendar(monthParam)
      .then((res) => { if (!cancelled) { setData(res.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load calendar.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [monthParam, refreshKey])

  const navigate = (dir) => {
    const base = parseISO(`${monthParam}-01`)
    const next = dir === 1 ? addMonths(base, 1) : subMonths(base, 1)
    setSearchParams({ month: isoMonth(next) })
  }

  const handleDone = async (todoId) => {
    await markTodoDone(todoId)
    // trigger re-fetch by bumping the month param (same value re-runs the effect via refreshKey)
    setData(null)
    setLoading(true)
    getCalendar(monthParam).then((res) => { setData(res.data); setLoading(false) })
  }

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const buildGrid = () => {
    if (!data) return []
    const base = parseISO(`${monthParam}-01`)
    const totalDays = getDaysInMonth(base)
    // date-fns: getDay returns 0=Sun..6=Sat; we want Mon=0
    const firstDow = (getDay(base) + 6) % 7
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push(null)
    for (let d = 1; d <= totalDays; d++) cells.push(d)
    return cells
  }

  const cells = buildGrid()
  const monthLabel = data ? format(parseISO(`${data.month}-01`), 'MMMM yyyy') : monthParam

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">
          &larr; Prev
        </button>
        <h2 className="text-xl font-semibold text-gray-800">{monthLabel}</h2>
        <button onClick={() => navigate(1)} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">
          Next &rarr;
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="grid grid-cols-7 border-l border-t border-gray-200 rounded-lg overflow-hidden shadow-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-gray-100 text-center text-xs font-semibold text-gray-500 py-2 border-r border-b border-gray-200">
            {d}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="border-r border-b border-gray-200 bg-gray-50 min-h-[100px]" />
          }
          const dateKey = `${monthParam}-${String(day).padStart(2, '0')}`
          const dayData = data?.days?.[dateKey]
          const events = dayData?.events || []
          const todos = dayData?.todos || []
          const projectTasks = dayData?.project_tasks || []

          const isToday = dateKey === todayKey

          return (
            <div
              key={dateKey}
              onClick={() => onEventCreate(dateKey)}
              className={`border-r border-b border-gray-200 min-h-[100px] p-1 relative group cursor-pointer hover:brightness-95 ${isToday ? 'bg-yellow-50' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isToday ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>{day}</span>
              </div>

              <div className="space-y-1">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventEdit(ev) }}
                    className="w-full text-left text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate hover:bg-blue-200"
                  >
                    {ev.title}
                  </button>
                ))}

                {todos.map((td) => (
                  <div
                    key={td.id}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1 text-xs rounded px-1 py-0.5 ${td.overdue ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
                  >
                    <button
                      onClick={() => onTodoEdit(td)}
                      className="flex-1 text-left truncate"
                    >
                      {td.name}
                    </button>
                    <button
                      onClick={() => handleDone(td.id)}
                      className="shrink-0 hover:scale-110 transition-transform"
                      title="Mark done"
                    >
                      ✓
                    </button>
                  </div>
                ))}

                {projectTasks.map((pt) => (
                  <div
                    key={`pt-${pt.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-violet-100 text-violet-800 rounded px-1 py-0.5 truncate"
                    title={`${pt.project_name} — ${pt.name}`}
                  >
                    {pt.project_name} – {pt.name}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {loading && (
        <div className="text-center text-gray-400 text-sm mt-4">Loading…</div>
      )}
    </div>
  )
}
