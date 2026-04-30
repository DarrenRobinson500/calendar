import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { getGratitude, createGratitude, deleteGratitude, reorderGratitude } from '../api.js'

export default function GratitudeView() {
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const textareaRef = useRef(null)
  const dragIdx = useRef(null)

  useEffect(() => {
    getGratitude()
      .then((res) => { setEntries(res.data); setLoading(false) })
      .catch(() => { setError('Failed to load entries.'); setLoading(false) })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await createGratitude({ text: text.trim() })
      setEntries((prev) => [res.data, ...prev])
      setText('')
      textareaRef.current?.focus()
    } catch {
      setError('Failed to save entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    await deleteGratitude(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleDragStart = (idx) => { dragIdx.current = idx }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }

  const handleDragEnd = () => {
    dragIdx.current = null
    setDragOverIdx(null)
  }

  const handleDrop = async (targetIdx) => {
    const from = dragIdx.current
    setDragOverIdx(null)
    if (from === null || from === targetIdx) return
    const reordered = [...entries]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragIdx.current = null
    setEntries(reordered)
    await reorderGratitude(reordered.map((e) => e.id))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Gratitude</h2>

      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          ref={textareaRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What are you grateful for today?"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">Enter to submit · Shift+Enter for new line</p>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-sm">No entries yet.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry, idx) => (
            <li
              key={entry.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onDrop={() => handleDrop(idx)}
              className="relative bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm flex items-start gap-3 group"
            >
              {dragOverIdx === idx && dragIdx.current !== idx && (
                <div className="absolute -top-2 left-0 right-0 h-0.5 bg-blue-500 rounded-full pointer-events-none" />
              )}
              <span
                className="shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none text-base mt-0.5"
                title="Drag to reorder"
              >
                ⠿
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{entry.text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(parseISO(entry.created_at), 'EEE d MMM yyyy, h:mm a')}
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none mt-0.5"
                title="Delete"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
