import { useState, useCallback } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import ClaudeView from './components/ClaudeView.jsx'
import GratitudeView from './components/GratitudeView.jsx'
import TodayView from './components/TodayView.jsx'
import CalendarView from './components/CalendarView.jsx'
import TodoListView from './components/TodoListView.jsx'
import BillListView from './components/BillListView.jsx'
import DataView from './components/DataView.jsx'
import ProjectView from './components/ProjectView.jsx'
import PeopleView from './components/PeopleView.jsx'
import DogsView from './components/DogsView.jsx'
import ShoppingView from './components/ShoppingView.jsx'
import TrackerView from './components/TrackerView.jsx'
import EventModal from './components/EventModal.jsx'
import TodoModal from './components/TodoModal.jsx'
import BillModal from './components/BillModal.jsx'

export default function App() {
  const location = useLocation()

  const [eventModal, setEventModal] = useState({ open: false, event: null, defaultDate: null })
  const [todoModal, setTodoModal] = useState({ open: false, todo: null })
  const [billModal, setBillModal] = useState({ open: false, bill: null })
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)
  const [todoRefreshKey, setTodoRefreshKey] = useState(0)
  const [billRefreshKey, setBillRefreshKey] = useState(0)

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

  const openBillCreate = useCallback(() => {
    setBillModal({ open: true, bill: null })
  }, [])

  const openBillEdit = useCallback((bill) => {
    setBillModal({ open: true, bill })
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

  const handleBillSuccess = useCallback(() => {
    setBillModal({ open: false, bill: null })
    setCalendarRefreshKey((k) => k + 1)
    setBillRefreshKey((k) => k + 1)
  }, [])

  const navLink = (path, label) => (
    <Link
      to={path}
      className={`text-sm font-medium ${location.pathname === path ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
    >
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-lg text-gray-800">Calendar</span>
        {navLink('/today', 'Today')}
        <Link
          to="/calendar"
          className={`text-sm font-medium ${location.pathname.startsWith('/calendar') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Calendar
        </Link>
        {navLink('/todos', 'To-Dos')}
        {navLink('/bills', 'Bills')}
        {navLink('/projects', 'Projects')}
        {navLink('/people', 'People')}
        {navLink('/dogs', 'Dogs')}
        {navLink('/shopping', 'Shopping')}
        {navLink('/claude', 'Claude')}
        {navLink('/gratitude', 'Gratitude')}
        {navLink('/data', 'Data')}
        {navLink('/tracker', 'Tracker')}
      </nav>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route
            path="/today"
            element={
              <TodayView
                refreshKey={calendarRefreshKey}
                onEventEdit={openEventEdit}
                onTodoEdit={openTodoEdit}
                onBillEdit={openBillEdit}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <CalendarView
                refreshKey={calendarRefreshKey}
                onEventCreate={openEventCreate}
                onEventEdit={openEventEdit}
                onTodoEdit={openTodoEdit}
                onBillEdit={openBillEdit}
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
          <Route
            path="/bills"
            element={
              <BillListView
                refreshKey={billRefreshKey}
                onBillCreate={openBillCreate}
                onBillEdit={openBillEdit}
              />
            }
          />
          <Route path="/people" element={<PeopleView />} />
          <Route path="/dogs" element={<DogsView />} />
          <Route path="/shopping" element={<ShoppingView />} />
          <Route path="/tracker" element={<TrackerView />} />
          <Route path="/claude" element={<ClaudeView />} />
          <Route path="/gratitude" element={<GratitudeView />} />
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

      {billModal.open && (
        <BillModal
          bill={billModal.bill}
          onSuccess={handleBillSuccess}
          onClose={() => setBillModal({ open: false, bill: null })}
        />
      )}
    </div>
  )
}
