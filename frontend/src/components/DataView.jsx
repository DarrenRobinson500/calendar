import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { exportData, importData } from '../api.js'

function Section({ title, description, buttonLabel, buttonClass, onClick }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="pr-6">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button onClick={onClick} className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${buttonClass}`}>
        {buttonLabel}
      </button>
    </div>
  )
}

export default function DataView() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const uploadRef = useRef(null)
  const clearUploadRef = useRef(null)

  const setFeedback = (msg, isError = false) => {
    setStatus(isError ? null : msg)
    setError(isError ? msg : null)
  }

  const handleDownload = async () => {
    setStatus(null); setError(null)
    try {
      const res = await exportData()
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calapp-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
      const { events, todos } = res.data
      setFeedback(`Downloaded ${events.length} event(s) and ${todos.length} to-do(s).`)
    } catch {
      setFeedback('Download failed.', true)
    }
  }

  const handleFile = (file, clear) => {
    if (!file) return
    setStatus(null); setError(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result)
        const res = await importData(data, clear)
        const { imported_events, imported_todos } = res.data
        setFeedback(`Imported ${imported_events} event(s) and ${imported_todos} to-do(s).`)
      } catch {
        setFeedback('Import failed. Make sure the file is a valid CalApp backup.', true)
      }
    }
    reader.readAsText(file)
  }

  const triggerUpload = (ref, clear) => {
    ref.current.value = ''
    ref.current.onchange = (e) => handleFile(e.target.files[0], clear)
    ref.current.click()
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Data</h2>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6">
        <Section
          title="Download"
          description="Export all events and to-dos to a JSON backup file."
          buttonLabel="Download"
          buttonClass="bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleDownload}
        />
        <Section
          title="Upload"
          description="Add events and to-dos from a backup file. Existing records are kept."
          buttonLabel="Upload"
          buttonClass="bg-gray-100 text-gray-800 hover:bg-gray-200"
          onClick={() => triggerUpload(uploadRef, false)}
        />
        <Section
          title="Clear and Upload"
          description="Delete all existing events and to-dos, then restore from a backup file."
          buttonLabel="Clear and Upload"
          buttonClass="bg-red-50 text-red-600 hover:bg-red-100"
          onClick={() => {
            if (confirm('This will delete all existing events and to-dos. Continue?')) {
              triggerUpload(clearUploadRef, true)
            }
          }}
        />
      </div>

      <input ref={uploadRef} type="file" accept=".json" className="hidden" />
      <input ref={clearUploadRef} type="file" accept=".json" className="hidden" />

      {status && <p className="mt-4 text-sm text-green-600">{status}</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  )
}
