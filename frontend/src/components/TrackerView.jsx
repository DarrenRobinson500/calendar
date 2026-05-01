import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getTrackers, createTracker, updateTracker, deleteTracker, reorderTrackers,
  getTrackerEntries, upsertTrackerEntry, deleteTrackerEntry,
} from '../api.js'

function niceTicks(lo, hi) {
  const range = hi - lo
  if (range <= 0) return [lo]
  const rough = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = ([1, 2, 2.5, 5, 10].find(m => m * mag >= rough) ?? 10) * mag
  const first = Math.ceil((lo + step * 1e-9) / step) * step
  const ticks = []
  for (let i = 0; i < 20; i++) {
    const t = Math.round((first + step * i) * 1e10) / 1e10
    if (t > hi + step * 0.01) break
    ticks.push(t)
  }
  return ticks.length ? ticks : [lo]
}

function fmt(v) {
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs >= 10000) return Math.round(v).toLocaleString()
  if (abs >= 100) return parseFloat(v.toFixed(1)).toString()
  if (abs >= 10) return parseFloat(v.toFixed(2)).toString()
  return parseFloat(v.toFixed(3)).toString()
}

function TrackerChart({ entries, unit }) {
  if (!entries.length) {
    return <p className="text-xs text-gray-400 py-6 text-center">Record at least one value to see the chart.</p>
  }

  const W = 800, H = 260, T = 20, R = 24, B = 48, L = 60
  const pw = W - L - R
  const ph = H - T - B
  const bot = T + ph

  const vals = entries.map(e => parseFloat(e.value))
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (lo === hi) { lo -= 1; hi += 1 }
  const vRange = hi - lo
  lo -= vRange * 0.1
  hi += vRange * 0.1

  const xOf = i => entries.length === 1 ? L + pw / 2 : L + (i / (entries.length - 1)) * pw
  const yOf = v => T + (1 - (v - lo) / (hi - lo)) * ph

  const ticks = niceTicks(lo, hi)
  const labelEvery = Math.max(1, Math.ceil(entries.length / 8))

  const pts = entries.map((e, i) => `${xOf(i).toFixed(1)},${yOf(parseFloat(e.value)).toFixed(1)}`).join(' ')
  const areaD = entries.length >= 2
    ? `M ${xOf(0).toFixed(1)},${bot.toFixed(1)} L ${pts} L ${xOf(entries.length - 1).toFixed(1)},${bot.toFixed(1)} Z`
    : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block overflow-visible">
      {/* gridlines */}
      {ticks.map(t => (
        <line key={t} x1={L} x2={L + pw} y1={yOf(t).toFixed(1)} y2={yOf(t).toFixed(1)} stroke="#f3f4f6" strokeWidth={1} />
      ))}
      {/* area fill */}
      {areaD && <path d={areaD} fill="#3b82f6" fillOpacity={0.07} />}
      {/* line */}
      {entries.length >= 2 && (
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* dots */}
      {entries.map((e, i) => (
        <circle key={e.id} cx={xOf(i).toFixed(1)} cy={yOf(parseFloat(e.value)).toFixed(1)} r={4} fill="#3b82f6" stroke="white" strokeWidth={2}>
          <title>{format(parseISO(e.date), 'd MMM yyyy')}: {parseFloat(e.value)}{unit ? ' ' + unit : ''}</title>
        </circle>
      ))}
      {/* axes */}
      <line x1={L} x2={L} y1={T} y2={bot} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={L} x2={L + pw} y1={bot} y2={bot} stroke="#e5e7eb" strokeWidth={1} />
      {/* y-axis labels */}
      {ticks.map(t => (
        <text key={t} x={L - 8} y={yOf(t).toFixed(1)} dy="0.35em" textAnchor="end" fontSize={11} fill="#9ca3af">
          {fmt(t)}
        </text>
      ))}
      {/* x-axis labels */}
      {entries.map((e, i) => (
        (i % labelEvery === 0 || i === entries.length - 1) ? (
          <text key={e.id} x={xOf(i).toFixed(1)} y={bot + 18} textAnchor="middle" fontSize={11} fill="#9ca3af">
            {format(parseISO(e.date), 'd MMM')}
          </text>
        ) : null
      ))}
    </svg>
  )
}

function TrackerModal({ tracker, onSuccess, onClose }) {
  const [form, setForm] = useState({ name: tracker?.name ?? '', unit: tracker?.unit ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (tracker) {
        await updateTracker(tracker.id, { name: form.name.trim(), unit: form.unit, order: tracker.order })
      } else {
        await createTracker({ name: form.name.trim(), unit: form.unit, order: 0 })
      }
      onSuccess()
    } catch {
      setError('Failed to save.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{tracker ? 'Edit Tracker' : 'New Tracker'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Name (e.g. Weight, Steps, Sleep)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={form.unit}
            onChange={set('unit')}
            placeholder="Unit — optional (e.g. kg, hrs, %)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TrackerView() {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [trackers, setTrackers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [entries, setEntries] = useState([])
  const [entryDate, setEntryDate] = useState(today)
  const [entryValue, setEntryValue] = useState('')
  const [loadingTrackers, setLoadingTrackers] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)
  const [entryError, setEntryError] = useState(null)
  const [trackerModal, setTrackerModal] = useState({ open: false, tracker: null })
  const [dragOver, setDragOver] = useState(null)
  const dragIdx = useRef(null)

  useEffect(() => {
    getTrackers().then(r => { setTrackers(r.data); setLoadingTrackers(false) })
  }, [])

  useEffect(() => {
    if (!selectedId) { setEntries([]); return }
    setLoadingEntries(true)
    getTrackerEntries(selectedId).then(r => { setEntries(r.data); setLoadingEntries(false) })
  }, [selectedId])

  const handleTrackerSuccess = () => {
    setTrackerModal({ open: false, tracker: null })
    getTrackers().then(r => setTrackers(r.data))
  }

  const handleDeleteTracker = async (id) => {
    if (!confirm('Delete this tracker and all its data?')) return
    await deleteTracker(id)
    setTrackers(t => t.filter(x => x.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const handleAddEntry = async (e) => {
    e.preventDefault()
    if (!entryValue || !entryDate || !selectedId) return
    setSavingEntry(true)
    setEntryError(null)
    try {
      const res = await upsertTrackerEntry({ tracker: selectedId, date: entryDate, value: parseFloat(entryValue) })
      setEntries(prev => {
        const rest = prev.filter(x => x.date !== res.data.date)
        return [...rest, res.data].sort((a, b) => a.date.localeCompare(b.date))
      })
      setEntryValue('')
    } catch {
      setEntryError('Failed to save entry.')
    } finally {
      setSavingEntry(false)
    }
  }

  const handleDeleteEntry = async (id) => {
    if (!confirm('Delete this entry?')) return
    await deleteTrackerEntry(id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const handleDragStart = idx => { dragIdx.current = idx }
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx) }
  const handleDragEnd = () => { dragIdx.current = null; setDragOver(null) }
  const handleDrop = async targetIdx => {
    const from = dragIdx.current
    setDragOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...trackers]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragIdx.current = null
    setTrackers(reordered)
    await reorderTrackers(reordered.map(t => t.id))
  }

  const selected = trackers.find(t => t.id === selectedId) ?? null
  const chartEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const tableEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex gap-4 items-start">
      {/* Tracker list */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Trackers</h3>
          <button
            onClick={() => setTrackerModal({ open: true, tracker: null })}
            className="text-blue-600 hover:text-blue-700 text-xl leading-none font-light"
            title="Add tracker"
          >+</button>
        </div>
        {loadingTrackers ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : trackers.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No trackers yet.</p>
        ) : (
          <ul>
            {trackers.map((t, idx) => (
              <li
                key={t.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(idx)}
                onClick={() => setSelectedId(t.id)}
                className={`relative flex items-center gap-1 px-2 py-2 cursor-pointer group border-b border-gray-50 last:border-0 ${selectedId === t.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                {dragOver === idx && dragIdx.current !== idx && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-blue-500 pointer-events-none" />
                )}
                <span className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-xs shrink-0">⠿</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedId === t.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{t.name}</p>
                  {t.unit && <p className="text-xs text-gray-400 truncate">{t.unit}</p>}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setTrackerModal({ open: true, tracker: t }) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTracker(t.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
                  title="Delete"
                >&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-400">Select a tracker, or create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Record form */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">{selected.name}</h2>
                {selected.unit && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{selected.unit}</span>
                )}
              </div>
              <form onSubmit={handleAddEntry} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={e => setEntryDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Value{selected.unit ? ` (${selected.unit})` : ''}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={entryValue}
                    onChange={e => setEntryValue(e.target.value)}
                    placeholder="0"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingEntry || !entryValue}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEntry ? 'Saving…' : 'Record'}
                </button>
              </form>
              {entryError && <p className="text-red-500 text-xs mt-2">{entryError}</p>}
              <p className="text-xs text-gray-400 mt-2">Recording for a date that already has a value will replace it.</p>
            </div>

            {/* Chart */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Chart
                {entries.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
                )}
              </h3>
              {loadingEntries ? (
                <p className="text-xs text-gray-400">Loading…</p>
              ) : (
                <TrackerChart entries={chartEntries} unit={selected.unit} />
              )}
            </div>

            {/* Entries table */}
            {tableEntries.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">History</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      <th className="px-5 py-2 text-left font-medium">Date</th>
                      <th className="px-5 py-2 text-right font-medium">Value</th>
                      <th className="px-5 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tableEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2 text-gray-700">{format(parseISO(entry.date), 'd MMM yyyy')}</td>
                        <td className="px-5 py-2 text-right font-medium text-gray-800 tabular-nums">
                          {parseFloat(entry.value)}{selected.unit ? ' ' + selected.unit : ''}
                        </td>
                        <td className="px-5 py-2 text-right">
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-gray-300 hover:text-red-400 text-base leading-none"
                            title="Delete"
                          >&times;</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {trackerModal.open && (
        <TrackerModal
          tracker={trackerModal.tracker}
          onSuccess={handleTrackerSuccess}
          onClose={() => setTrackerModal({ open: false, tracker: null })}
        />
      )}
    </div>
  )
}
