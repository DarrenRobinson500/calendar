import { useState, useEffect, useRef } from 'react'
import {
  getShops, createShop, updateShop, deleteShop, reorderShops,
  getShoppingItems, createShoppingItem, deleteShoppingItem, reorderShoppingItems, toggleShoppingItem,
} from '../api.js'

function ShopModal({ shop, onSuccess, onClose }) {
  const [name, setName] = useState(shop?.name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (shop) {
        await updateShop(shop.id, { name: name.trim(), order: shop.order })
      } else {
        await createShop({ name: name.trim(), order: 0 })
      }
      onSuccess()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{shop ? 'Edit Shop' : 'New Shop'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shop name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ShoppingView() {
  const [shops, setShops] = useState([])
  const [selectedShopId, setSelectedShopId] = useState(null)
  const [items, setItems] = useState([])
  const [newItemName, setNewItemName] = useState('')
  const [loadingShops, setLoadingShops] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [shopModal, setShopModal] = useState({ open: false, shop: null })
  const newItemRef = useRef(null)

  const dragShopIdx = useRef(null)
  const [dragShopOver, setDragShopOver] = useState(null)
  const dragItemIdx = useRef(null)
  const [dragItemOver, setDragItemOver] = useState(null)

  useEffect(() => {
    getShops()
      .then((res) => { setShops(res.data); setLoadingShops(false) })
      .catch(() => setLoadingShops(false))
  }, [])

  useEffect(() => {
    if (!selectedShopId) { setItems([]); return }
    setLoadingItems(true)
    getShoppingItems(selectedShopId)
      .then((res) => { setItems(res.data); setLoadingItems(false) })
      .catch(() => setLoadingItems(false))
  }, [selectedShopId])

  const handleShopSuccess = () => {
    setShopModal({ open: false, shop: null })
    getShops().then((res) => setShops(res.data))
  }

  const handleDeleteShop = async (id) => {
    if (!confirm('Delete this shop and all its items?')) return
    await deleteShop(id)
    setShops((s) => s.filter((x) => x.id !== id))
    if (selectedShopId === id) setSelectedShopId(null)
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim() || !selectedShopId) return
    setAddingItem(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0
    try {
      const res = await createShoppingItem({ shop: selectedShopId, name: newItemName.trim(), checked: false, order: maxOrder })
      setItems((prev) => [...prev, res.data])
      setNewItemName('')
      newItemRef.current?.focus()
    } finally {
      setAddingItem(false)
    }
  }

  const handleToggle = async (id) => {
    const res = await toggleShoppingItem(id)
    setItems((prev) => prev.map((x) => x.id === id ? res.data : x))
  }

  const handleDeleteItem = async (id) => {
    await deleteShoppingItem(id)
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  // shop drag-to-reorder
  const handleShopDragStart = (idx) => { dragShopIdx.current = idx }
  const handleShopDragOver = (e, idx) => { e.preventDefault(); setDragShopOver(idx) }
  const handleShopDragEnd = () => { dragShopIdx.current = null; setDragShopOver(null) }
  const handleShopDrop = async (targetIdx) => {
    const from = dragShopIdx.current
    setDragShopOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...shops]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragShopIdx.current = null
    setShops(reordered)
    await reorderShops(reordered.map((s) => s.id))
  }

  // item drag-to-reorder
  const handleItemDragStart = (idx) => { dragItemIdx.current = idx }
  const handleItemDragOver = (e, idx) => { e.preventDefault(); setDragItemOver(idx) }
  const handleItemDragEnd = () => { dragItemIdx.current = null; setDragItemOver(null) }
  const handleItemDrop = async (targetIdx) => {
    const from = dragItemIdx.current
    setDragItemOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragItemIdx.current = null
    setItems(reordered)
    await reorderShoppingItems(reordered.map((i) => i.id))
  }

  const selectedShop = shops.find((s) => s.id === selectedShopId) ?? null

  return (
    <div className="flex gap-4 items-start">
      {/* Shops panel */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Shops</h3>
          <button
            onClick={() => setShopModal({ open: true, shop: null })}
            className="text-emerald-600 hover:text-emerald-700 text-xl leading-none font-light"
            title="Add shop"
          >+</button>
        </div>
        {loadingShops ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : shops.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No shops yet.</p>
        ) : (
          <ul>
            {shops.map((shop, idx) => (
              <li
                key={shop.id}
                draggable
                onDragStart={() => handleShopDragStart(idx)}
                onDragOver={(e) => handleShopDragOver(e, idx)}
                onDragEnd={handleShopDragEnd}
                onDrop={() => handleShopDrop(idx)}
                className={`relative flex items-center gap-1 px-2 py-2 cursor-pointer group border-b border-gray-50 last:border-0 ${selectedShopId === shop.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedShopId(shop.id)}
              >
                {dragShopOver === idx && dragShopIdx.current !== idx && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-emerald-500 pointer-events-none" />
                )}
                <span className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-xs shrink-0" title="Drag to reorder">⠿</span>
                <span className={`flex-1 text-sm truncate ${selectedShopId === shop.id ? 'text-emerald-700 font-medium' : 'text-gray-700'}`}>{shop.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShopModal({ open: true, shop }) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteShop(shop.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
                  title="Delete"
                >&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Items panel */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              {selectedShop ? selectedShop.name : 'Items'}
            </h3>
          </div>
        </div>

        {!selectedShopId ? (
          <p className="text-xs text-gray-400 px-5 py-4">Select a shop to see its list.</p>
        ) : (
          <div className="p-4">
            {/* Add item form */}
            <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
              <input
                ref={newItemRef}
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Add item…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={addingItem || !newItemName.trim()}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 shrink-0"
              >
                Add
              </button>
            </form>

            {loadingItems ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-400">No items yet.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((item, idx) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={() => handleItemDragStart(idx)}
                    onDragOver={(e) => handleItemDragOver(e, idx)}
                    onDragEnd={handleItemDragEnd}
                    onDrop={() => handleItemDrop(idx)}
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg group border ${item.checked ? 'bg-emerald-50 border-emerald-200' : 'border-transparent hover:bg-gray-50 hover:border-gray-100'}`}
                  >
                    {dragItemOver === idx && dragItemIdx.current !== idx && (
                      <div className="absolute -top-px left-0 right-0 h-0.5 bg-emerald-500 pointer-events-none" />
                    )}
                    <span
                      className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-sm shrink-0"
                      title="Drag to reorder"
                    >⠿</span>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-gray-300 hover:text-red-400 text-base leading-none shrink-0"
                      title="Delete"
                    >&times;</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {shopModal.open && (
        <ShopModal
          shop={shopModal.shop}
          onSuccess={handleShopSuccess}
          onClose={() => setShopModal({ open: false, shop: null })}
        />
      )}
    </div>
  )
}
