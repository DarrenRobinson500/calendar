import { useEffect, useState } from 'react'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import {
  getProjects, getTasks, updateTask,
  reorderTasks, bulkUpdateTasks, markTaskDone,
} from '../api.js'
import GanttChart from './GanttChart.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'
import TaskFormModal from './TaskFormModal.jsx'

function cascadeFrom(tasks, predId, predEnd) {
  let result = tasks
  for (const dep of tasks.filter(t => t.depends_on === predId)) {
    const newStart = addDays(predEnd, 1)
    const dur = Math.max(0, differenceInDays(parseISO(dep.end_date), parseISO(dep.start_date)))
    const newEnd = addDays(newStart, dur)
    result = result.map(t =>
      t.id === dep.id
        ? { ...t, start_date: format(newStart, 'yyyy-MM-dd'), end_date: format(newEnd, 'yyyy-MM-dd') }
        : t
    )
    result = cascadeFrom(result, dep.id, newEnd)
  }
  return result
}

export default function ProjectView() {
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [taskModal, setTaskModal] = useState({ open: false, task: null, anchorTaskId: null, defaultStartDate: null })
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  // Load projects on mount
  useEffect(() => {
    getProjects().then(res => {
      setProjects(res.data)
      if (res.data.length > 0) setSelectedId(res.data[0].id)
    })
  }, [])

  // Load tasks when project changes
  useEffect(() => {
    if (!selectedId) { setTasks([]); return }
    setSelectedTaskId(null)
    setLoading(true)
    getTasks(selectedId)
      .then(res => setTasks(res.data))
      .finally(() => setLoading(false))
  }, [selectedId])

  const refreshTasks = () =>
    getTasks(selectedId).then(res => setTasks(res.data))

  const handleTaskDone = async (taskId) => {
    await markTaskDone(taskId)
    await refreshTasks()
  }

  const handleSave = async (updatedTasks, type) => {
    if (type === 'reorder') {
      await reorderTasks(updatedTasks.map(t => t.id))
    } else {
      await bulkUpdateTasks(updatedTasks.map(t => ({
        id: t.id, start_date: t.start_date, end_date: t.end_date,
      })))
    }
    await refreshTasks()
  }

  const handleDependencyCreate = async (taskId, dependsOnId) => {
    const task = tasks.find(t => t.id === taskId)
    const pred = tasks.find(t => t.id === dependsOnId)
    if (!task || !pred) return

    // Shift dependent to start the day after its predecessor ends
    const predEnd = parseISO(pred.end_date)
    const newStart = addDays(predEnd, 1)
    const dur = Math.max(0, differenceInDays(parseISO(task.end_date), parseISO(task.start_date)))
    const newEnd = addDays(newStart, dur)

    await updateTask(taskId, {
      ...task,
      depends_on: dependsOnId,
      start_date: format(newStart, 'yyyy-MM-dd'),
      end_date: format(newEnd, 'yyyy-MM-dd'),
    })

    // Cascade further dependents
    let updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, depends_on: dependsOnId, start_date: format(newStart, 'yyyy-MM-dd'), end_date: format(newEnd, 'yyyy-MM-dd') }
        : t
    )
    updated = cascadeFrom(updated, taskId, newEnd)
    const changed = updated.filter(t => {
      const orig = tasks.find(o => o.id === t.id)
      return orig && (orig.start_date !== t.start_date || orig.end_date !== t.end_date) && t.id !== taskId
    })
    if (changed.length) await bulkUpdateTasks(changed.map(t => ({ id: t.id, start_date: t.start_date, end_date: t.end_date })))

    await refreshTasks()
  }

  const handleDeleteLink = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    await updateTask(taskId, { ...task, depends_on: null })
    await refreshTasks()
  }

  const handleProjectCreated = (project) => {
    setProjects(prev => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedId(project.id)
    setShowProjectModal(false)
  }

  const handleTaskSaved = async (savedInfo) => {
    const { anchorTaskId } = taskModal
    setTaskModal({ open: false, task: null, anchorTaskId: null, defaultStartDate: null })
    const freshRes = await getTasks(selectedId)
    const freshTasks = freshRes.data
    setTasks(freshTasks)

    if (savedInfo?.isNew && savedInfo?.id && anchorTaskId) {
      const anchor = freshTasks.find(t => t.id === anchorTaskId)
      const newTask = freshTasks.find(t => t.id === savedInfo.id)
      if (newTask && anchor) {
        await updateTask(savedInfo.id, { ...newTask, depends_on: anchorTaskId })
        const anchorIdx = freshTasks.findIndex(t => t.id === anchorTaskId)
        const newTaskIdx = freshTasks.findIndex(t => t.id === savedInfo.id)
        const reordered = [...freshTasks]
        const [moved] = reordered.splice(newTaskIdx, 1)
        reordered.splice(anchorIdx + 1, 0, moved)
        await reorderTasks(reordered.map(t => t.id))
      }
      await refreshTasks()
    } else if (savedInfo?.id && savedInfo?.end_date) {
      // Cascade dependents if this was an edit with a changed end_date
      const cascaded = cascadeFrom(freshTasks, savedInfo.id, parseISO(savedInfo.end_date))
      const changed = cascaded.filter(t => {
        const orig = freshTasks.find(o => o.id === t.id)
        return orig && (orig.start_date !== t.start_date || orig.end_date !== t.end_date)
      })
      if (changed.length) {
        await bulkUpdateTasks(changed.map(t => ({ id: t.id, start_date: t.start_date, end_date: t.end_date })))
        const updated = await getTasks(selectedId)
        setTasks(updated.data)
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h2 className="text-xl font-semibold text-gray-800 mr-2">Projects</h2>

        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {projects.length === 0 && <option value="">— no projects —</option>}
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <button
          onClick={() => setShowProjectModal(true)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          + New Project
        </button>

        {selectedId && (
          <button
            onClick={() => {
              const anchor = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null
              const defaultStart = anchor
                ? format(addDays(parseISO(anchor.end_date), 1), 'yyyy-MM-dd')
                : null
              setTaskModal({ open: true, task: null, anchorTaskId: anchor?.id ?? null, defaultStartDate: defaultStart })
            }}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Add Task
          </button>
        )}

        <span className="text-xs text-gray-400 ml-2">
          Drag bar edges to resize · Drag bar to move · ● to link · ⠿ to reorder · double-click to edit
        </span>
      </div>

      {/* Chart */}
      {!selectedId && projects.length === 0 ? (
        <p className="text-gray-400 text-sm">Create a project to get started.</p>
      ) : loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <GanttChart
          tasks={tasks}
          onSave={handleSave}
          onDependencyCreate={handleDependencyCreate}
          onDeleteLink={handleDeleteLink}
          onTaskEdit={(task) => setTaskModal({ open: true, task, anchorTaskId: null, defaultStartDate: null })}
          selectedTaskId={selectedTaskId}
          onTaskSelect={setSelectedTaskId}
          onTaskDone={handleTaskDone}
        />
      )}

      {showProjectModal && (
        <ProjectFormModal onSuccess={handleProjectCreated} onClose={() => setShowProjectModal(false)} />
      )}

      {taskModal.open && (
        <TaskFormModal
          task={taskModal.task}
          projectId={selectedId}
          defaultStartDate={taskModal.defaultStartDate}
          onSuccess={handleTaskSaved}
          onClose={() => setTaskModal({ open: false, task: null, anchorTaskId: null, defaultStartDate: null })}
        />
      )}
    </div>
  )
}
