import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getBills, deleteBill,
  getBillCategories, createBillCategory, deleteBillCategory,
  getAllBillInstances, updateBillInstance, deleteBillInstance,
} from '../api.js'

function SortTh({ label, col, sortCol, sortDir, onSort, className = '' }) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-2 cursor-pointer select-none hover:bg-gray-200 transition-colors ${className}`}
    >
      {label}
      <span className="ml-1 text-gray-400">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

export default function BillListView({ refreshKey, onBillCreate, onBillEdit }) {
  const [bills, setBills] = useState([])
  const [categories, setCategories] = useState([])
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [sortCol, setSortCol] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', amount: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getBills(), getBillCategories(), getAllBillInstances()])
      .then(([billsRes, catsRes, instsRes]) => {
        if (cancelled) return
        setBills(billsRes.data)
        setCategories(catsRes.data)
        setInstances(instsRes.data)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError('Failed to load bills.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [refreshKey])

  const billMap = useMemo(() => {
    const m = {}
    bills.forEach(b => { m[b.id] = b })
    return m
  }, [bills])

  const instanceCountByBill = useMemo(() => {
    const counts = {}
    instances.forEach(i => { counts[i.bill] = (counts[i.bill] || 0) + 1 })
    return counts
  }, [instances])

  const enrichedInstances = useMemo(() => instances.map(inst => ({
    ...inst,
    bill_name: billMap[inst.bill]?.name ?? '—',
    category_name: billMap[inst.bill]?.category_name ?? null,
  })), [instances, billMap])

  const sortedInstances = useMemo(() => {
    return [...enrichedInstances].sort((a, b) => {
      let av, bv
      if (sortCol === 'category') { av = a.category_name ?? ''; bv = b.category_name ?? '' }
      else if (sortCol === 'bill') { av = a.bill_name; bv = b.bill_name }
      else if (sortCol === 'date') { av = a.date; bv = b.date }
      else { av = Number(a.amount); bv = Number(b.amount) }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [enrichedInstances, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // ── Category actions ─────────────────────────────────────────────────────────

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

  // ── Bill actions ─────────────────────────────────────────────────────────────

  const handleDeleteBill = async (id) => {
    if (!confirm('Delete this bill and all its instances?')) return
    try {
      await deleteBill(id)
      setBills(prev => prev.filter(b => b.id !== id))
      setInstances(prev => prev.filter(i => i.bill !== id))
    } catch {
      setError('Failed to delete bill.')
    }
  }

  // ── Instance actions ──────────────────────────────────────────────────────────

  const startEdit = (inst) => {
    setEditingId(inst.id)
    setEditForm({ date: inst.date, amount: String(inst.amount) })
  }

  const saveEdit = async (inst) => {
    try {
      await updateBillInstance(inst.id, { bill: inst.bill, date: editForm.date, amount: Number(editForm.amount) })
      setInstances(prev => prev.map(i => i.id === inst.id ? { ...i, date: editForm.date, amount: editForm.amount } : i))
      setEditingId(null)
    } catch {
      setError('Failed to save instance.')
    }
  }

  const handleDeleteInstance = async (id) => {
    if (!confirm('Delete this instance?')) return
    try {
      await deleteBillInstance(id)
      setInstances(prev => prev.filter(i => i.id !== id))
    } catch {
      setError('Failed to delete instance.')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Bills</h2>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* ── 1. Categories ──────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.length === 0 && <p className="text-xs text-gray-400">No categories yet.</p>}
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
            <button onClick={handleAddCategory} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              Add
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. Bills ────────────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Bills</h3>
          <button onClick={onBillCreate} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            + Add Bill
          </button>
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
                  <th className="px-4 py-2 text-left">Frequency</th>
                  <th className="px-4 py-2 text-right">Instances</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bills.map(bill => (
                  <tr key={bill.id} onClick={() => onBillEdit(bill)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-2 font-medium text-gray-800">{bill.name}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {bill.category_name
                        ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{bill.category_name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-500">Every {bill.frequency_days}d</td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">
                      {instanceCountByBill[bill.id] || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteBill(bill.id) }}
                        className="text-red-500 hover:underline text-xs"
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 3. Instances ────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Instances</h3>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : instances.length === 0 ? (
          <p className="text-gray-400 text-sm">No instances yet. Open a bill to add instances.</p>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                <tr>
                  <SortTh label="Category" col="category" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-left" />
                  <SortTh label="Bill" col="bill" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-left" />
                  <SortTh label="Date" col="date" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-left" />
                  <SortTh label="Amount" col="amount" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sortedInstances.map(inst => (
                  editingId === inst.id ? (
                    <tr key={inst.id} className="bg-blue-50">
                      <td className="px-4 py-2 text-gray-400 text-xs">{inst.category_name || '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{inst.bill_name}</td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.amount}
                          onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-24 border border-gray-300 rounded px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(inst)} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={inst.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-2 text-gray-500">
                        {inst.category_name
                          ? <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{inst.category_name}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{inst.bill_name}</td>
                      <td className="px-4 py-2 text-gray-600">{format(parseISO(inst.date), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">${Number(inst.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(inst)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDeleteInstance(inst.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
