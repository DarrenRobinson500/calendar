import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { format, getDay, getDaysInMonth, addMonths, subMonths, parseISO } from 'date-fns'
import { getCalendar, markTodoDone, markTaskDone, markBillDone } from '../api.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function isoMonth(d) {
  return format(d, 'yyyy-MM')
}

export default function CalendarView({ refreshKey, onEventCreate, onEventEdit, onTodoEdit, onBirthdayEdit, onBillEdit }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
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

  const navMonth = (dir) => {
    const base = parseISO(`${monthParam}-01`)
    const next = dir === 1 ? addMonths(base, 1) : subMonths(base, 1)
    setSearchParams({ month: isoMonth(next) })
  }

  const refetch = () => {
    setData(null)
    setLoading(true)
    getCalendar(monthParam).then((res) => { setData(res.data); setLoading(false) })
  }

  const handleDone = async (todoId) => {
    await markTodoDone(todoId)
    refetch()
  }

  const handleTaskDone = async (taskId) => {
    await markTaskDone(taskId)
    refetch()
  }

  const handleBillDone = async (billId) => {
    await markBillDone(billId)
    refetch()
  }

  const goToProject = (projectId) => {
    navigate('/projects', { state: { focusProjectId: projectId } })
  }

  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const buildGrid = () => {
    if (!data) return []
    const base = parseISO(`${monthParam}-01`)
    const totalDays = getDaysInMonth(base)
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
        <button onClick={() => navMonth(-1)} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">
          &larr; Prev
        </button>
        <h2 className="text-xl font-semibold text-gray-800">{monthLabel}</h2>
        <button onClick={() => navMonth(1)} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm">
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
          const birthdays = dayData?.birthdays || []
          const events = dayData?.events || []
          const todos = dayData?.todos || []
          const projectTasks = dayData?.project_tasks || []
          const nightTodos = dayData?.night_todos || []
          const bills = dayData?.bills || []

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
                {birthdays.map((bd) => (
                  <button
                    key={`bd-${bd.id}`}
                    onClick={(e) => { e.stopPropagation(); onBirthdayEdit(bd) }}
                    className="w-full text-left text-xs bg-yellow-100 text-yellow-800 rounded px-1 py-0.5 truncate hover:bg-yellow-200"
                  >
                    {bd.name}
                  </button>
                ))}

                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventEdit({ ...ev, date: dateKey }) }}
                    className="w-full text-left text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate hover:bg-blue-200"
                  >
                    {ev.title}
                  </button>
                ))}

                {todos.map((td) => (
                  <div
                    key={td.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs rounded px-1 py-0.5 bg-green-100 text-green-800"
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
                    onDoubleClick={(e) => { e.stopPropagation(); goToProject(pt.project_id) }}
                    className="flex items-center gap-1 text-xs bg-violet-100 text-violet-800 rounded px-1 py-0.5 cursor-pointer"
                    title="Double-click to open project"
                  >
                    <span className="flex-1 truncate">
                      {pt.project_name} – {pt.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTaskDone(pt.id) }}
                      className="shrink-0 hover:scale-110 transition-transform"
                      title="Mark done"
                    >
                      ✓
                    </button>
                  </div>
                ))}

                {nightTodos.map((td) => (
                  <div
                    key={`nt-${td.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-1 py-0.5"
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

                {bills.map((bill) => (
                  <div
                    key={`bill-${bill.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded px-1 py-0.5"
                  >
                    <button
                      onClick={() => onBillEdit(bill)}
                      className="flex-1 text-left truncate"
                    >
                      {bill.name}
                    </button>
                    <button
                      onClick={() => handleBillDone(bill.id)}
                      className="shrink-0 hover:scale-110 transition-transform"
                      title="Mark paid"
                    >
                      ✓
                    </button>
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
