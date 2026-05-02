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

function TrackerChart({ entries, unit, tracker }) {
  const hasTarget = !!(
    tracker?.target_start_date && tracker?.target_end_date &&
    tracker?.target_start_value != null && tracker?.target_end_value != null
  )

  if (!entries.length && !hasTarget) {
    return <p className="text-xs text-gray-400 py-6 text-center">Record at least one value to see the chart.</p>
  }

  const W = 800, H = 260, T = 20, R = 24, B = 48, L = 60
  const pw = W - L - R
  const ph = H - T - B
  const bot = T + ph

  // x-axis: true date scale spanning entries + target dates
  const timestamps = entries.map(e => parseISO(e.date).getTime())
  if (hasTarget) {
    timestamps.push(parseISO(tracker.target_start_date).getTime())
    timestamps.push(parseISO(tracker.target_end_date).getTime())
  }
  const minTs = Math.min(...timestamps)
  const maxTs = Math.max(...timestamps)
  const tsRange = maxTs - minTs
  const xOf = dateStr => tsRange === 0 ? L + pw / 2 : L + (parseISO(dateStr).getTime() - minTs) / tsRange * pw

  // weekly x-axis ticks (Mondays)
  const msPerDay = 24 * 60 * 60 * 1000
  const ONE_WEEK_MS = 7 * msPerDay
  const xDateTicks = (() => {
    if (tsRange === 0) return entries.length ? [new Date(minTs)] : []
    const dow = new Date(minTs).getDay()
    const daysToNextMon = dow === 1 ? 0 : (8 - dow) % 7
    const firstMonTs = minTs + daysToNextMon * msPerDay
    const result = []
    for (let ts = firstMonTs; ts <= maxTs + 1000; ts += ONE_WEEK_MS) result.push(new Date(ts))
    if (result.length === 0) {
      result.push(new Date(minTs))
      if (maxTs > minTs) result.push(new Date(maxTs))
    }
    return result
  })()

  // y-axis: span all entry values + target values
  const vals = entries.map(e => parseFloat(e.value))
  if (hasTarget) {
    vals.push(parseFloat(tracker.target_start_value))
    vals.push(parseFloat(tracker.target_end_value))
  }
  let lo = Math.min(...vals), hi = Math.max(...vals)
  if (lo === hi) { lo -= 1; hi += 1 }
  const vRange = hi - lo
  lo -= vRange * 0.1
  hi += vRange * 0.1
  const yOf = v => T + (1 - (v - lo) / (hi - lo)) * ph

  const ticks = niceTicks(lo, hi)

  // entry geometry
  const pts = entries.map(e => `${xOf(e.date).toFixed(1)},${yOf(parseFloat(e.value)).toFixed(1)}`).join(' ')
  const areaD = entries.length >= 2
    ? `M ${xOf(entries[0].date).toFixed(1)},${bot.toFixed(1)} L ${pts} L ${xOf(entries[entries.length - 1].date).toFixed(1)},${bot.toFixed(1)} Z`
    : null

  // target geometry
  const tx1 = hasTarget ? xOf(tracker.target_start_date) : 0
  const ty1 = hasTarget ? yOf(parseFloat(tracker.target_start_value)) : 0
  const tx2 = hasTarget ? xOf(tracker.target_end_date) : 0
  const ty2 = hasTarget ? yOf(parseFloat(tracker.target_end_value)) : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block overflow-visible">
      {/* gridlines */}
      {ticks.map(t => (
        <line key={t} x1={L} x2={L + pw} y1={yOf(t).toFixed(1)} y2={yOf(t).toFixed(1)} stroke="#f3f4f6" strokeWidth={1} />
      ))}
      {/* area fill */}
      {areaD && <path d={areaD} fill="#3b82f6" fillOpacity={0.07} />}
      {/* data line */}
      {entries.length >= 2 && (
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* target line */}
      {hasTarget && (
        <line x1={tx1.toFixed(1)} y1={ty1.toFixed(1)} x2={tx2.toFixed(1)} y2={ty2.toFixed(1)}
          stroke="#eab308" strokeWidth={2} strokeDasharray="6 3" strokeLinecap="round" />
      )}
      {/* data dots */}
      {entries.map(e => (
        <circle key={e.id} cx={xOf(e.date).toFixed(1)} cy={yOf(parseFloat(e.value)).toFixed(1)} r={4} fill="#3b82f6" stroke="white" strokeWidth={2}>
          <title>{format(parseISO(e.date), 'd MMM yyyy')}: {parseFloat(e.value)}{unit ? ' ' + unit : ''}</title>
        </circle>
      ))}
      {/* target endpoint dots */}
      {hasTarget && (
        <>
          <circle cx={tx1.toFixed(1)} cy={ty1.toFixed(1)} r={4} fill="#eab308" stroke="white" strokeWidth={2}>
            <title>Target start ({format(parseISO(tracker.target_start_date), 'd MMM yyyy')}): {parseFloat(tracker.target_start_value)}{unit ? ' ' + unit : ''}</title>
          </circle>
          <circle cx={tx2.toFixed(1)} cy={ty2.toFixed(1)} r={4} fill="#eab308" stroke="white" strokeWidth={2}>
            <title>Target end ({format(parseISO(tracker.target_end_date), 'd MMM yyyy')}): {parseFloat(tracker.target_end_value)}{unit ? ' ' + unit : ''}</title>
          </circle>
        </>
      )}
      {/* axes */}
      <line x1={L} x2={L} y1={T} y2={bot} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={L} x2={L + pw} y1={bot} y2={bot} stroke="#e5e7eb" strokeWidth={1} />
      {/* y-axis labels */}
      {ticks.map(t => (
        <text key={t} x={L - 8} y={yOf(t).toFixed(1)} dy="0.35em" textAnchor="end" fontSize={11} fill="#9ca3af">
          {fmt(t)}
        </text>
      ))}
      {/* x-axis labels: one per week */}
      {xDateTicks.map(d => {
        const iso = format(d, 'yyyy-MM-dd')
        return (
          <text key={iso} x={xOf(iso).toFixed(1)} y={bot + 18} textAnchor="middle" fontSize={11} fill="#9ca3af">
            {format(d, 'd MMM')}
          </text>
        )
      })}
    </svg>
  )
}

function TrackerModal({ tracker, onSuccess, onClose }) {
  const [form, setForm] = useState({
    name: tracker?.name ?? '',
    unit: tracker?.unit ?? '',
    target_start_date: tracker?.target_start_date ?? '',
    target_end_date: tracker?.target_end_date ?? '',
    target_start_value: tracker?.target_start_value != null ? String(parseFloat(tracker.target_start_value)) : '',
    target_end_value: tracker?.target_end_value != null ? String(parseFloat(tracker.target_end_value)) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      order: tracker?.order ?? 0,
      target_start_date: form.target_start_date || null,
      target_end_date: form.target_end_date || null,
      target_start_value: form.target_start_value !== '' ? parseFloat(form.target_start_value) : null,
      target_end_value: form.target_end_value !== '' ? parseFloat(form.target_end_value) : null,
    }
    try {
      if (tracker) {
        await updateTracker(tracker.id, payload)
      } else {
        await createTracker(payload)
      }
      onSuccess()
    } catch {
      setError('Failed to save.')
      setSaving(false)
    }
  }

  const fieldCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{tracker ? 'Edit Tracker' : 'New Tracker'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input autoFocus type="text" value={form.name} onChange={set('name')}
            placeholder="Name (e.g. Weight, Steps, Sleep)" className={fieldCls} />
          <input type="text" value={form.unit} onChange={set('unit')}
            placeholder="Unit — optional (e.g. kg, hrs, %)" className={fieldCls} />

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Target <span className="font-normal text-gray-400">(optional — draws a yellow guide line on the chart)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start date</label>
                <input type="date" value={form.target_start_date} onChange={set('target_start_date')} className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start value</label>
                <input type="number" step="any" value={form.target_start_value} onChange={set('target_start_value')}
                  placeholder="0" className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End date</label>
                <input type="date" value={form.target_end_date} onChange={set('target_end_date')} className={fieldCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End value</label>
                <input type="number" step="any" value={form.target_end_value} onChange={set('target_end_value')}
                  placeholder="0" className={fieldCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
                <TrackerChart entries={chartEntries} unit={selected.unit} tracker={selected} />
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
