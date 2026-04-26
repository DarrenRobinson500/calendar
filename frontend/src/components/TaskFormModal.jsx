import { useState } from 'react'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import { createTask, updateTask, deleteTask } from '../api.js'

const today = format(new Date(), 'yyyy-MM-dd')

function durationFromDates(start, end) {
  return Math.max(1, differenceInDays(parseISO(end), parseISO(start)) + 1)
}

export default function TaskFormModal({ task, projectId, defaultStartDate, onSuccess, onClose }) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState({
    name: task?.name || '',
    description: task?.description || '',
    start_date: task?.start_date || defaultStartDate || today,
    duration: task ? durationFromDates(task.start_date, task.end_date) : 1,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const computedEndDate = format(
    addDays(parseISO(form.start_date), Math.max(1, Number(form.duration)) - 1),
    'yyyy-MM-dd'
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Number(form.duration) < 1) {
      setError('Duration must be at least 1 day.')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { name: form.name, description: form.description, start_date: form.start_date, end_date: computedEndDate }
    try {
      if (isEdit) {
        await updateTask(task.id, { ...payload, project: task.project, depends_on: task.depends_on, order: task.order })
        onSuccess({ id: task.id, end_date: computedEndDate })
      } else {
        const res = await createTask({ ...payload, project: projectId })
        onSuccess({ id: res.data.id, isNew: true })
      }
    } catch {
      setError('Failed to save task.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return
    setSaving(true)
    try {
      await deleteTask(task.id)
      onSuccess()
    } catch {
      setError('Failed to delete task.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input required value={form.name} onChange={set('name')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={set('description')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input type="date" required value={form.start_date} onChange={set('start_date')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input type="number" min="1" required value={form.duration} onChange={set('duration')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">End date: {computedEndDate}</p>
          <div className="flex items-center justify-between pt-1">
            {isEdit
              ? <button type="button" onClick={handleDelete} disabled={saving} className="text-red-500 hover:underline text-sm">Delete</button>
              : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
