import { useState, useCallback } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import CalendarView from './components/CalendarView.jsx'
import TodoListView from './components/TodoListView.jsx'
import DataView from './components/DataView.jsx'
import ProjectView from './components/ProjectView.jsx'
import EventModal from './components/EventModal.jsx'
import TodoModal from './components/TodoModal.jsx'

export default function App() {
  const location = useLocation()

  const [eventModal, setEventModal] = useState({ open: false, event: null, defaultDate: null })
  const [todoModal, setTodoModal] = useState({ open: false, todo: null })
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [todoRefreshKey, setTodoRefreshKey] = useState(0)

  const openEventCreate = useCallback((defaultDate) => {
    setEventModal({ open: true, event: null, defaultDate })
  }, [])

  const openEventEdit = useCallback((event) => {
    setEventModal({ open: true, event, defaultDate: null })
  }, [])

  const openTodoCreate = useCallback(() => {
    setTodoModal({ open: true, todo: null })
  }, [])

  const openTodoEdit = useCallback((todo) => {
    setTodoModal({ open: true, todo })
  }, [])

  const handleEventSuccess = useCallback(() => {
    setEventModal({ open: false, event: null, defaultDate: null })
    setCalendarRefreshKey((k) => k + 1)
  }, [])

  const handleTodoSuccess = useCallback(() => {
    setTodoModal({ open: false, todo: null })
    setCalendarRefreshKey((k) => k + 1)
    setTodoRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-lg text-gray-800">CalApp</span>
        <Link
          to="/calendar"
          className={`text-sm font-medium ${location.pathname.startsWith('/calendar') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Calendar
        </Link>
        <Link
          to="/todos"
          className={`text-sm font-medium ${location.pathname === '/todos' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          To-Dos
        </Link>
        <Link
          to="/projects"
          className={`text-sm font-medium ${location.pathname === '/projects' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Projects
        </Link>
        <Link
          to="/data"
          className={`text-sm font-medium ${location.pathname === '/data' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Data
        </Link>
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route
            path="/calendar"
            element={
              <CalendarView
                refreshKey={calendarRefreshKey}
                onEventCreate={openEventCreate}
                onEventEdit={openEventEdit}
                onTodoEdit={openTodoEdit}
              />
            }
          />
          <Route
            path="/todos"
            element={
              <TodoListView
                refreshKey={todoRefreshKey}
                onTodoCreate={openTodoCreate}
                onTodoEdit={openTodoEdit}
              />
            }
          />
          <Route path="/projects" element={<ProjectView />} />
          <Route path="/data" element={<DataView />} />
        </Routes>
      </main>

      {eventModal.open && (
        <EventModal
          event={eventModal.event}
          defaultDate={eventModal.defaultDate}
          onSuccess={handleEventSuccess}
          onClose={() => setEventModal({ open: false, event: null, defaultDate: null })}
        />
      )}

      {todoModal.open && (
        <TodoModal
          todo={todoModal.todo}
          onSuccess={handleTodoSuccess}
          onClose={() => setTodoModal({ open: false, todo: null })}
        />
      )}
    </div>
  )
}
