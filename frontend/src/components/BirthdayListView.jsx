import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { getBirthdays, deleteBirthday } from '../api.js'

export default function BirthdayListView({ refreshKey, onBirthdayCreate, onBirthdayEdit }) {
  const [birthdays, setBirthdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getBirthdays()
      .then((res) => {
        if (!cancelled) {
          const sorted = [...res.data].sort((a, b) => {
            const aDate = parseISO(a.date)
            const bDate = parseISO(b.date)
            if (aDate.getMonth() !== bDate.getMonth()) return aDate.getMonth() - bDate.getMonth()
            return aDate.getDate() - bDate.getDate()
          })
          setBirthdays(sorted)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) { setError('Failed to load birthdays.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleDelete = async (id) => {
    if (!confirm('Delete this birthday?')) return
    await deleteBirthday(id)
    setBirthdays((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Birthdays</h2>
        <button
          onClick={onBirthdayCreate}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Add Birthday
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : birthdays.length === 0 ? (
        <p className="text-gray-400 text-sm">No birthdays yet.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {birthdays.map((bd) => (
                <tr
                  key={bd.id}
                  onClick={() => onBirthdayEdit(bd)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{bd.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {format(parseISO(bd.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(bd.id) }}
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
