import { useEffect, useRef, useState } from 'react'
import { getTodos, deleteTodo, reorderTodos } from '../api.js'

export default function TodoListView({ refreshKey, onTodoCreate, onTodoEdit }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dragIdx = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTodos()
      .then((res) => { if (!cancelled) { setTodos(res.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load todos.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleDelete = async (id) => {
    if (!confirm('Delete this todo?')) return
    await deleteTodo(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const handleDragStart = (idx) => {
    dragIdx.current = idx
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (targetIdx) => {
    const from = dragIdx.current
    if (from === null || from === targetIdx) return
    const reordered = [...todos]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragIdx.current = null
    setTodos(reordered)
    await reorderTodos(reordered.map((t) => t.id))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">To-Dos</h2>
        <button
          onClick={onTodoCreate}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Add Todo
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : todos.length === 0 ? (
        <p className="text-gray-400 text-sm">No todos yet.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-2 py-2 w-6" />
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {todos.map((todo, idx) => (
                <tr
                  key={todo.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  onClick={() => onTodoEdit(todo)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td
                    className="px-2 py-2 text-gray-300 cursor-grab active:cursor-grabbing select-none"
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to reorder"
                  >
                    ⠿
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-800">{todo.name}</td>
                  <td className="px-4 py-2 text-gray-400 max-w-xs whitespace-pre-wrap">{todo.description}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(todo.id) }}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
