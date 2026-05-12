import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  createBill, updateBill, deleteBill,
  getBillCategories, createBillCategory,
  getBillInstances, createBillInstance, updateBillInstance, deleteBillInstance,
} from '../api.js'

const today = format(new Date(), 'yyyy-MM-dd')

function InstanceRow({ instance, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ date: instance.date, amount: String(instance.amount) })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateBillInstance(instance.id, {
      bill: instance.bill,
      date: form.date,
      amount: Number(form.amount),
    })
    setSaving(false)
    setEditing(false)
    onSaved({ ...instance, date: form.date, amount: form.amount })
  }

  const handleDelete = async () => {
    await deleteBillInstance(instance.id)
    onDeleted(instance.id)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Amount"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >{saving ? '…' : 'Save'}</button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >Cancel</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1 text-sm group">
      <span className="flex-1 text-gray-700">{format(parseISO(instance.date), 'MMM d, yyyy')}</span>
      <span className="text-gray-800 font-medium">${Number(instance.amount).toFixed(2)}</span>
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >Edit</button>
      <button
        onClick={handleDelete}
        className="text-xs text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >Delete</button>
    </div>
  )
}

function AddInstanceForm({ billId, defaultAmount, onAdded, onCancel }) {
  const [form, setForm] = useState({ date: today, amount: defaultAmount ? String(defaultAmount) : '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const res = await createBillInstance({ bill: billId, date: form.date, amount: Number(form.amount) })
    setSaving(false)
    onAdded(res.data)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-1">
      <input
        type="date"
        required
        value={form.date}
        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <input
        type="number"
        min="0"
        step="0.01"
        required
        value={form.amount}
        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Amount"
      />
      <button
        type="submit"
        disabled={saving}
        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >{saving ? '…' : 'Add'}</button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
      >Cancel</button>
    </form>
  )
}

export default function BillModal({ bill, onSuccess, onClose }) {
  const isEdit = Boolean(bill)
  const [form, setForm] = useState({
    name: bill?.name || '',
    frequency_days: bill?.frequency_days || '',
    category: bill?.category != null ? String(bill.category) : '',
  })
  const [categories, setCategories] = useState([])
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [instances, setInstances] = useState([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [addingInstance, setAddingInstance] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getBillCategories().then(res => setCategories(res.data))
    if (isEdit) {
      setLoadingInstances(true)
      getBillInstances(bill.id).then(res => {
        setInstances(res.data)
        setLoadingInstances(false)
      })
    }
  }, [])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await createBillCategory({ name: newCategoryName.trim() })
      const cat = res.data
      setCategories(prev => [...prev, cat])
      setForm(f => ({ ...f, category: String(cat.id) }))
      setNewCategoryName('')
      setAddingCategory(false)
    } catch {
      setError('Failed to create category.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        frequency_days: Number(form.frequency_days),
        category: form.category ? Number(form.category) : null,
      }
      if (isEdit) {
        await updateBill(bill.id, payload)
      } else {
        await createBill(payload)
      }
      onSuccess()
    } catch {
      setError('Failed to save bill.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this bill?')) return
    setSaving(true)
    try {
      await deleteBill(bill.id)
      onSuccess()
    } catch {
      setError('Failed to delete bill.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{isEdit ? 'Edit Bill' : 'New Bill'}</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex gap-2">
              <select
                value={form.category}
                onChange={set('category')}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAddingCategory(v => !v)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                title="Create new category"
              >+</button>
            </div>
            {addingCategory && (
              <div className="flex gap-2 mt-2">
                <input
                  autoFocus
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } }}
                />
                <button type="button" onClick={handleCreateCategory} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => { setAddingCategory(false); setNewCategoryName('') }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            )}
          </div>

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

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button type="button" onClick={handleDelete} disabled={saving} className="text-red-500 hover:underline text-sm">
                Delete
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>

        {isEdit && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">Instances</p>
              {!addingInstance && (
                <button
                  onClick={() => setAddingInstance(true)}
                  className="text-xs text-blue-600 hover:underline"
                >+ Add</button>
              )}
            </div>

            {loadingInstances ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {instances.length === 0 && !addingInstance && (
                  <p className="text-xs text-gray-400 py-1">No instances yet.</p>
                )}
                {instances.map(inst => (
                  <InstanceRow
                    key={inst.id}
                    instance={inst}
                    onSaved={updated => setInstances(prev => prev.map(i => i.id === updated.id ? updated : i))}
                    onDeleted={id => setInstances(prev => prev.filter(i => i.id !== id))}
                  />
                ))}
              </div>
            )}

            {addingInstance && (
              <AddInstanceForm
                billId={bill.id}
                defaultAmount={form.amount}
                onAdded={inst => { setInstances(prev => [inst, ...prev]); setAddingInstance(false) }}
                onCancel={() => setAddingInstance(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
