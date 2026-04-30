import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { getBills, deleteBill } from '../api.js'

export default function BillListView({ refreshKey, onBillCreate, onBillEdit }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getBills()
      .then((res) => { if (!cancelled) { setBills(res.data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load bills.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill?')) return
    await deleteBill(id)
    setBills((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Bills</h2>
        <button
          onClick={onBillCreate}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Add Bill
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : bills.length === 0 ? (
        <p className="text-gray-400 text-sm">No bills yet.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {bills.map((bill) => (
                <tr
                  key={bill.id}
                  onClick={() => onBillEdit(bill)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{bill.name}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {format(parseISO(bill.due_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    ${Number(bill.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(bill.id) }}
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
