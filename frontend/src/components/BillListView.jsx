import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { getBills, deleteBill, getBillCategories, createBillCategory, deleteBillCategory } from '../api.js'

export default function BillListView({ refreshKey, onBillCreate, onBillEdit }) {
  const [bills, setBills] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getBills(), getBillCategories()])
      .then(([billsRes, catsRes]) => {
        if (cancelled) return
        setBills(billsRes.data)
        setCategories(catsRes.data)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError('Failed to load bills.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [refreshKey])

  const handleDeleteBill = async (id) => {
    if (!confirm('Delete this bill?')) return
    await deleteBill(id)
    setBills((prev) => prev.filter((b) => b.id !== id))
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await createBillCategory({ name: newCategoryName.trim() })
      setCategories(prev => [...prev, res.data])
      setNewCategoryName('')
    } catch {
      setError('Failed to create category.')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category? Bills in this category will become uncategorised.')) return
    try {
      await deleteBillCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      setBills(prev => prev.map(b => b.category === id ? { ...b, category: null, category_name: null } : b))
    } catch {
      setError('Failed to delete category.')
    }
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

      {/* Categories */}
      <div className="mb-6 border border-gray-200 rounded-lg p-3 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categories</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.length === 0 && (
            <p className="text-xs text-gray-400">No categories yet.</p>
          )}
          {categories.map(cat => (
            <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {cat.name}
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-blue-400 hover:text-red-500 leading-none ml-0.5"
                title="Delete category"
              >&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory() } }}
          />
          <button
            onClick={handleAddCategory}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >Add</button>
        </div>
      </div>

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
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">Instances</th>
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
                  <td className="px-4 py-2 text-gray-500">
                    {bill.category_name
                      ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{bill.category_name}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {format(parseISO(bill.due_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-800">
                    ${Number(bill.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500 text-xs">
                    {bill.instances_count > 0 ? bill.instances_count : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBill(bill.id) }}
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
