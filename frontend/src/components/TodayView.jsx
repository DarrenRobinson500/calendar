import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays, parseISO } from 'date-fns'
import { getCalendar, markTodoDone, markTaskDone, markBillDone } from '../api.js'

function ItemRow({ color, children, onDoubleClick, title }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 ${color}${onDoubleClick ? ' cursor-pointer' : ''}`}
      onDoubleClick={onDoubleClick}
      title={title}
    >
      {children}
    </div>
  )
}

function DayColumn({ label, dateKey, dayData, onEventEdit, onTodoEdit, onBirthdayEdit, onBillEdit, refetch }) {
  const navigate = useNavigate()
  const birthdays = dayData?.birthdays || []
  const events = dayData?.events || []
  const todos = dayData?.todos || []
  const projectTasks = dayData?.project_tasks || []
  const nightTodos = dayData?.night_todos || []
  const bills = dayData?.bills || []
  const total = birthdays.length + events.length + todos.length + projectTasks.length + nightTodos.length + bills.length

  const handleTodoDone = async (id) => { await markTodoDone(id); refetch() }
  const handleTaskDone = async (id) => { await markTaskDone(id); refetch() }
  const handleBillDone = async (id) => { await markBillDone(id); refetch() }

  const date = parseISO(dateKey)

  return (
    <div className="flex-1 min-w-0">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <h3 className="text-xl font-semibold text-gray-800">{format(date, 'EEEE, MMMM d')}</h3>
      </div>

      {total === 0 ? (
        <p className="text-gray-400 text-sm">Nothing scheduled.</p>
      ) : (
        <div className="space-y-2">
          {birthdays.map((bd) => (
            <ItemRow key={`bd-${bd.id}`} color="bg-yellow-100">
              <button
                onClick={() => onBirthdayEdit(bd)}
                className="w-full text-left"
              >
                <p className="font-medium text-yellow-800">{bd.name}</p>
                <p className="text-xs text-yellow-700 mt-0.5">{format(parseISO(bd.date), 'MMMM d, yyyy')}</p>
              </button>
            </ItemRow>
          ))}

          {events.map((ev) => (
            <ItemRow key={`ev-${ev.id}`} color="bg-blue-100">
              <button
                onClick={() => onEventEdit({ ...ev, date: dateKey })}
                className="w-full text-left"
              >
                <p className="font-medium text-blue-800">{ev.title}</p>
                {ev.description && <p className="text-xs text-blue-700 mt-0.5">{ev.description}</p>}
              </button>
            </ItemRow>
          ))}

          {todos.map((td) => (
            <ItemRow key={`td-${td.id}`} color="bg-green-100">
              <div className="flex items-start gap-3">
                <button onClick={() => onTodoEdit(td)} className="flex-1 text-left min-w-0">
                  <p className="font-medium text-green-800">{td.name}</p>
                  {td.description && <p className="text-xs text-green-700 mt-0.5">{td.description}</p>}
                  {td.overdue && <p className="text-xs text-green-600 mt-0.5">Overdue — was due {format(parseISO(td.next_due), 'MMM d')}</p>}
                </button>
                <button
                  onClick={() => handleTodoDone(td.id)}
                  className="shrink-0 text-lg leading-none text-green-600 hover:scale-110 transition-transform mt-0.5"
                  title="Mark done"
                >
                  ✓
                </button>
              </div>
            </ItemRow>
          ))}

          {projectTasks.map((pt) => (
            <ItemRow
              key={`pt-${pt.id}`}
              color="bg-violet-100"
              onDoubleClick={() => navigate('/projects', { state: { focusProjectId: pt.project_id } })}
              title="Double-click to open project"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-violet-800">{pt.name}</p>
                  <p className="text-xs text-violet-600 mt-0.5">{pt.project_name}</p>
                </div>
                <button
                  onClick={() => handleTaskDone(pt.id)}
                  className="shrink-0 text-lg leading-none text-violet-600 hover:scale-110 transition-transform mt-0.5"
                  title="Mark done"
                >
                  ✓
                </button>
              </div>
            </ItemRow>
          ))}

          {nightTodos.map((td) => (
            <ItemRow key={`nt-${td.id}`} color="bg-gray-100">
              <div className="flex items-start gap-3">
                <button onClick={() => onTodoEdit(td)} className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-700">{td.name}</p>
                  {td.description && <p className="text-xs text-gray-500 mt-0.5">{td.description}</p>}
                </button>
                <button
                  onClick={() => handleTodoDone(td.id)}
                  className="shrink-0 text-lg leading-none text-gray-500 hover:scale-110 transition-transform mt-0.5"
                  title="Mark done"
                >
                  ✓
                </button>
              </div>
            </ItemRow>
          ))}

          {bills.map((bill) => (
            <ItemRow key={`bill-${bill.id}`} color="bg-gray-100">
              <div className="flex items-start gap-3">
                <button onClick={() => onBillEdit(bill)} className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-700">{bill.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">${Number(bill.amount).toFixed(2)}</p>
                </button>
                <button
                  onClick={() => handleBillDone(bill.id)}
                  className="shrink-0 text-lg leading-none text-gray-500 hover:scale-110 transition-transform mt-0.5"
                  title="Mark paid"
                >
                  ✓
                </button>
              </div>
            </ItemRow>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TodayView({ refreshKey, onEventEdit, onTodoEdit, onBirthdayEdit, onBillEdit }) {
  const [days, setDays] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchKey, setFetchKey] = useState(0)

  const todayDate = new Date()
  const tomorrowDate = addDays(todayDate, 1)
  const todayKey = format(todayDate, 'yyyy-MM-dd')
  const tomorrowKey = format(tomorrowDate, 'yyyy-MM-dd')
  const todayMonth = format(todayDate, 'yyyy-MM')
  const tomorrowMonth = format(tomorrowDate, 'yyyy-MM')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetches = [getCalendar(todayMonth)]
    if (tomorrowMonth !== todayMonth) fetches.push(getCalendar(tomorrowMonth))

    Promise.all(fetches)
      .then((results) => {
        if (cancelled) return
        const merged = {}
        results.forEach((res) => Object.assign(merged, res.data.days))
        setDays(merged)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to load data.'); setLoading(false) }
      })

    return () => { cancelled = true }
  }, [todayMonth, tomorrowMonth, refreshKey, fetchKey])

  const refetch = useCallback(() => setFetchKey((k) => k + 1), [])

  const sharedProps = { onEventEdit, onTodoEdit, onBirthdayEdit, onBillEdit, refetch }

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Today &amp; Tomorrow</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="flex gap-8 items-start">
          <DayColumn label="Today" dateKey={todayKey} dayData={days[todayKey]} {...sharedProps} />
          <div className="w-px bg-gray-200 self-stretch" />
          <DayColumn label="Tomorrow" dateKey={tomorrowKey} dayData={days[tomorrowKey]} {...sharedProps} />
        </div>
      )}
    </div>
  )
}
