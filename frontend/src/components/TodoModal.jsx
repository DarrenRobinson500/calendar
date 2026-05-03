import { useState } from 'react'
import { format } from 'date-fns'
import { createTodo, updateTodo, deleteTodo } from '../api.js'

const today = format(new Date(), 'yyyy-MM-dd')

export default function TodoModal({ todo, onSuccess, onClose }) {
  const isEdit = Boolean(todo)
  const [form, setForm] = useState({
    name: todo?.name || '',
    description: todo?.description || '',
    frequency_days: todo?.frequency_days || '',
    next_due: todo?.next_due || today,
    one_off: todo?.one_off ?? false,
    night_time: todo?.night_time ?? false,
    sticky: todo?.sticky ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const toggle = (field) => () => setForm((f) => ({ ...f, [field]: !f[field] }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        frequency_days: form.one_off ? 1 : Number(form.frequency_days),
      }
      if (isEdit) {
        await updateTodo(todo.id, payload)
      } else {
        await createTodo(payload)
      }
      onSuccess()
    } catch {
      setError('Failed to save todo.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this todo?')) return
    setSaving(true)
    try {
      await deleteTodo(todo.id)
      onSuccess()
    } catch {
      setError('Failed to delete todo.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edit To-Do' : 'New To-Do'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={set('name')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.one_off}
                onChange={toggle('one_off')}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">One-off</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.night_time}
                onChange={toggle('night_time')}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Night-time</span>
            </label>
            {!form.one_off && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.sticky}
                  onChange={toggle('sticky')}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">Sticky</span>
              </label>
            )}
          </div>

          {!form.one_off && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (days)</label>
              <input
                type="number"
                min="1"
                required
                value={form.frequency_days}
                onChange={set('frequency_days')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Due</label>
            <input
              type="date"
              required
              value={form.next_due}
              onChange={set('next_due')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="text-red-500 hover:underline text-sm"
              >
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
