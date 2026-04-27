import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { exportData, importData } from '../api.js'

const btnClass = 'w-40 px-4 py-2 rounded-lg text-sm font-medium border border-blue-600 text-blue-600 bg-white hover:bg-blue-50'

function Section({ title, description, buttonLabel, onClick }) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="pr-6">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button onClick={onClick} className={btnClass}>
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
      const { events, todos, projects } = res.data
      const tasks = projects.reduce((n, p) => n + p.tasks.length, 0)
      setFeedback(`Downloaded ${events.length} event(s), ${todos.length} to-do(s), ${projects.length} project(s) and ${tasks} task(s).`)
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
        const { imported_events, imported_todos, imported_projects, imported_tasks } = res.data
        setFeedback(`Imported ${imported_events} event(s), ${imported_todos} to-do(s), ${imported_projects} project(s) and ${imported_tasks} task(s).`)
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
          description="Export all events, to-dos, projects and tasks to a JSON backup file."
          buttonLabel="Download"
          onClick={handleDownload}
        />
        <Section
          title="Upload"
          description="Add events, to-dos, projects and tasks from a backup file. Existing records are kept."
          buttonLabel="Upload"
          onClick={() => triggerUpload(uploadRef, false)}
        />
        <Section
          title="Clear and Upload"
          description="Delete all existing data, then restore from a backup file."
          buttonLabel="Clear and Upload"
          onClick={() => {
            if (confirm('This will delete all existing data. Continue?')) {
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
