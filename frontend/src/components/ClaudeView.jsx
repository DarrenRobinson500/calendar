import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { getSettings, saveSettings } from '../api.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function formatDisplay(date) {
  return format(date, "EEE d MMM yyyy, h:mm a")
}

function formatTimeDiff(ms) {
  const totalMinutes = Math.round(Math.abs(ms) / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`)
  if (minutes > 0 && days === 0) parts.push(`${minutes} min`)
  return parts.join(' ') || 'less than a minute'
}

function ProgressBar({ percent, color }) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export default function ClaudeView() {
  const [start, setStart] = useState('')
  const [percentUsed, setPercentUsed] = useState('')
  const [now, setNow] = useState(new Date())
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Load from backend on mount
  useEffect(() => {
    getSettings().then((res) => {
      setStart(res.data.claude_start || '')
      setPercentUsed(res.data.claude_percent || '')
      setSettingsLoaded(true)
    })
  }, [])

  // Debounced save to backend
  useEffect(() => {
    if (!settingsLoaded) return
    const timer = setTimeout(() => {
      saveSettings({ claude_start: start, claude_percent: percentUsed })
    }, 500)
    return () => clearTimeout(timer)
  }, [start, percentUsed, settingsLoaded])

  // Update now every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const startDate = start ? new Date(start) : null
  const elapsed = startDate ? now - startDate : null
  const percentElapsed = elapsed !== null ? (elapsed / WEEK_MS) * 100 : null

  // Auto-advance week when elapsed exceeds 100%
  useEffect(() => {
    if (!settingsLoaded || percentElapsed === null || percentElapsed <= 100) return
    const newStart = new Date(startDate.getTime() + WEEK_MS)
    setStart(format(newStart, "yyyy-MM-dd'T'HH:mm"))
  }, [percentElapsed, settingsLoaded])

  const usedNum = percentUsed !== '' ? parseFloat(percentUsed) : null
  const evenAt = startDate && usedNum !== null
    ? new Date(startDate.getTime() + (usedNum / 100) * WEEK_MS)
    : null

  const overPace = evenAt !== null && evenAt > now

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Claude Usage</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week start</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claude used (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={percentUsed}
            onChange={(e) => setPercentUsed(e.target.value)}
            placeholder="e.g. 42"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {startDate && percentElapsed !== null && (
        <div className="mt-8 space-y-4">

          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Week elapsed</p>
            <p className="text-3xl font-semibold text-gray-800">{percentElapsed.toFixed(1)}%</p>
            <div className="mt-3">
              <ProgressBar percent={percentElapsed} color="bg-blue-400" />
            </div>
          </div>

          {usedNum !== null && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Claude used</p>
                <button
                  onClick={() => setPercentUsed(v => String(Math.min(100, parseFloat(v || '0') + 1)))}
                  className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                >+</button>
              </div>
              <p className="text-3xl font-semibold text-gray-800">{usedNum.toFixed(1)}%</p>
              <div className="mt-3">
                <ProgressBar percent={usedNum} color={overPace ? 'bg-red-400' : 'bg-green-400'} />
              </div>
            </div>
          )}

          {evenAt && (
            <div className={`border rounded-lg p-4 shadow-sm ${overPace ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${overPace ? 'text-red-400' : 'text-green-400'}`}>Even at</p>
              <p className={`text-lg font-semibold ${overPace ? 'text-red-800' : 'text-green-800'}`}>{formatDisplay(evenAt)}</p>
              <p className={`text-sm mt-1 ${overPace ? 'text-red-600' : 'text-green-600'}`}>
                {overPace
                  ? `Using faster than weekly pace — ${formatTimeDiff((usedNum - percentElapsed) / 100 * WEEK_MS)} over`
                  : `Using slower than weekly pace — ${formatTimeDiff((percentElapsed - usedNum) / 100 * WEEK_MS)} under`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
