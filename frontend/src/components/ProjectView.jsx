import { useEffect, useState } from 'react'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import {
  getProjects, getTasks, updateTask,
  reorderTasks, reorderProjects, bulkUpdateTasks, markTaskDone, updateProject,
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
  const [visibleProjectIds, setVisibleProjectIds] = useState(new Set())
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [tasksByProject, setTasksByProject] = useState({})
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [taskModal, setTaskModal] = useState({ open: false, task: null, anchorTaskId: null, defaultStartDate: null, projectId: null })
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  // Load projects on mount
  useEffect(() => {
    getProjects().then(res => {
      const ps = res.data
      setProjects(ps)
      const activeIds = new Set(ps.filter(p => p.active).map(p => p.id))
      setVisibleProjectIds(activeIds)
      if (ps.length > 0) setActiveProjectId(ps[0].id)
    })
  }, [])

  // Load tasks when visible projects or refreshKey changes
  useEffect(() => {
    if (visibleProjectIds.size === 0) { setTasksByProject({}); return }
    setLoading(true)
    Promise.all(
      [...visibleProjectIds].map(id => getTasks(id).then(res => ({ id, tasks: res.data })))
    ).then(results => {
      const byProject = {}
      results.forEach(({ id, tasks }) => { byProject[id] = tasks })
      setTasksByProject(byProject)
      setLoading(false)
    })
  }, [visibleProjectIds, refreshKey])

  const triggerRefresh = () => setRefreshKey(k => k + 1)

  const getProjectTasksForTask = (taskId) => {
    for (const tasks of Object.values(tasksByProject)) {
      if (tasks.some(t => t.id === taskId)) return tasks
    }
    return []
  }

  const isMultiProject = visibleProjectIds.size > 1

  const ganttRows = projects
    .filter(p => visibleProjectIds.has(p.id))
    .flatMap(p => {
      const tasks = tasksByProject[p.id] || []
      if (isMultiProject) {
        return [{ id: `header-${p.id}`, isHeader: true, name: p.name }, ...tasks]
      }
      return tasks
    })

  // ── Project management ────────────────────────────────────────────────────────

  const moveProject = async (idx, dir) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= projects.length) return
    const reordered = [...projects]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    setProjects(reordered)
    await reorderProjects(reordered.map(p => p.id))
  }

  const toggleVisible = (id) => {
    setVisibleProjectIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        if (id === activeProjectId) {
          const remaining = projects.filter(p => next.has(p.id))
          setActiveProjectId(remaining.length > 0 ? remaining[0].id : null)
        }
      } else {
        next.add(id)
        if (!activeProjectId) setActiveProjectId(id)
      }
      return next
    })
  }

  const handleToggleActive = async (id) => {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const res = await updateProject(id, { name: project.name, active: !project.active })
    setProjects(prev => prev.map(p => p.id === id ? res.data : p))
  }

  const handleProjectCreated = (project) => {
    setProjects(prev => {
      const next = [...prev, project]
      reorderProjects(next.map(p => p.id))
      return next
    })
    setVisibleProjectIds(prev => new Set([...prev, project.id]))
    setActiveProjectId(project.id)
    setShowProjectModal(false)
  }

  // ── Gantt callbacks ───────────────────────────────────────────────────────────

  const handleSave = async (updatedTasks, type) => {
    const realTasks = updatedTasks.filter(t => !t.isHeader)
    if (type === 'reorder') {
      await reorderTasks(realTasks.map(t => t.id))
    } else {
      await bulkUpdateTasks(realTasks.map(t => ({ id: t.id, start_date: t.start_date, end_date: t.end_date })))
    }
    triggerRefresh()
  }

  const handleDependencyCreate = async (taskId, dependsOnId) => {
    const projectTasks = getProjectTasksForTask(taskId)
    const task = projectTasks.find(t => t.id === taskId)
    const pred = projectTasks.find(t => t.id === dependsOnId)
    if (!task || !pred) return

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

    let updated = projectTasks.map(t =>
      t.id === taskId
        ? { ...t, depends_on: dependsOnId, start_date: format(newStart, 'yyyy-MM-dd'), end_date: format(newEnd, 'yyyy-MM-dd') }
        : t
    )
    updated = cascadeFrom(updated, taskId, newEnd)
    const changed = updated.filter(t => {
      const orig = projectTasks.find(o => o.id === t.id)
      return orig && (orig.start_date !== t.start_date || orig.end_date !== t.end_date) && t.id !== taskId
    })
    if (changed.length) await bulkUpdateTasks(changed.map(t => ({ id: t.id, start_date: t.start_date, end_date: t.end_date })))

    triggerRefresh()
  }

  const handleDeleteLink = async (taskId) => {
    const projectTasks = getProjectTasksForTask(taskId)
    const task = projectTasks.find(t => t.id === taskId)
    if (!task) return
    await updateTask(taskId, { ...task, depends_on: null })
    triggerRefresh()
  }

  const handleTaskDone = async (taskId) => {
    await markTaskDone(taskId)
    triggerRefresh()
  }

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId)
    if (taskId) {
      for (const [pid, tasks] of Object.entries(tasksByProject)) {
        if (tasks.some(t => t.id === taskId)) {
          setActiveProjectId(Number(pid))
          break
        }
      }
    }
  }

  const handleTaskSaved = async (savedInfo) => {
    const { anchorTaskId, projectId } = taskModal
    const pid = projectId || activeProjectId
    setTaskModal({ open: false, task: null, anchorTaskId: null, defaultStartDate: null, projectId: null })

    const freshRes = await getTasks(pid)
    const freshTasks = freshRes.data
    setTasksByProject(prev => ({ ...prev, [pid]: freshTasks }))

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
      triggerRefresh()
      setSelectedTaskId(savedInfo.id)
    } else if (savedInfo?.isNew && savedInfo?.id) {
      setSelectedTaskId(savedInfo.id)
    } else if (savedInfo?.id && savedInfo?.end_date) {
      const cascaded = cascadeFrom(freshTasks, savedInfo.id, parseISO(savedInfo.end_date))
      const changed = cascaded.filter(t => {
        const orig = freshTasks.find(o => o.id === t.id)
        return orig && (orig.start_date !== t.start_date || orig.end_date !== t.end_date)
      })
      if (changed.length) {
        await bulkUpdateTasks(changed.map(t => ({ id: t.id, start_date: t.start_date, end_date: t.end_date })))
        triggerRefresh()
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">

      {/* Project management panel */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Projects</span>
          <button
            onClick={() => setShowProjectModal(true)}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 text-gray-600"
          >
            + New Project
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {projects.map((p, idx) => (
            <div
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${activeProjectId === p.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
            >
              {/* Reorder buttons */}
              <div className="flex flex-col shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => moveProject(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-px"
                  title="Move up"
                >▲</button>
                <button
                  onClick={() => moveProject(idx, 1)}
                  disabled={idx === projects.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-px"
                  title="Move down"
                >▼</button>
              </div>

              {/* Visibility checkbox */}
              <input
                type="checkbox"
                checked={visibleProjectIds.has(p.id)}
                onChange={() => toggleVisible(p.id)}
                onClick={e => e.stopPropagation()}
                className="cursor-pointer shrink-0"
              />

              {/* Project name */}
              <span className={`flex-1 text-sm min-w-0 truncate ${activeProjectId === p.id ? 'font-semibold text-indigo-700' : p.active ? 'text-gray-800' : 'text-gray-400'}`}>
                {p.name}
                {!p.active && <span className="text-xs ml-1">(inactive)</span>}
              </span>

              {/* Activate / Deactivate */}
              <button
                onClick={e => { e.stopPropagation(); handleToggleActive(p.id) }}
                className={`text-xs px-2 py-0.5 rounded border shrink-0 ${p.active ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
              >
                {p.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-3">No projects yet — click + New Project to create one.</p>
          )}
        </div>
      </div>

      {/* Gantt toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {activeProjectId && (
          <button
            onClick={() => {
              const anchor = selectedTaskId ? ganttRows.find(t => !t.isHeader && t.id === selectedTaskId) : null
              const defaultStart = anchor
                ? format(addDays(parseISO(anchor.end_date), 1), 'yyyy-MM-dd')
                : null
              setTaskModal({ open: true, task: null, anchorTaskId: anchor?.id ?? null, defaultStartDate: defaultStart, projectId: activeProjectId })
            }}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Add Task
          </button>
        )}
        {isMultiProject && activeProjectId && (
          <span className="text-xs text-gray-500">
            Adding to: <strong className="text-indigo-600">{projects.find(p => p.id === activeProjectId)?.name}</strong>
            <span className="text-gray-400"> — click a project row above to change</span>
          </span>
        )}
        {!isMultiProject && visibleProjectIds.size > 0 && (
          <span className="text-xs text-gray-400">Drag bar edges to resize · Drag bar to move · ● to link · ⠿ to reorder · double-click to edit</span>
        )}
      </div>

      {/* Gantt chart */}
      {projects.length === 0 ? (
        <p className="text-gray-400 text-sm">Create a project to get started.</p>
      ) : visibleProjectIds.size === 0 ? (
        <p className="text-gray-400 text-sm">Check at least one project above to view its tasks.</p>
      ) : loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <GanttChart
          tasks={ganttRows}
          onSave={handleSave}
          onDependencyCreate={handleDependencyCreate}
          onDeleteLink={handleDeleteLink}
          onTaskEdit={(task) => setTaskModal({ open: true, task, anchorTaskId: null, defaultStartDate: null, projectId: activeProjectId })}
          selectedTaskId={selectedTaskId}
          onTaskSelect={handleTaskSelect}
          onTaskDone={handleTaskDone}
          isMultiProject={isMultiProject}
        />
      )}

      {showProjectModal && (
        <ProjectFormModal onSuccess={handleProjectCreated} onClose={() => setShowProjectModal(false)} />
      )}

      {taskModal.open && (
        <TaskFormModal
          task={taskModal.task}
          projectId={taskModal.projectId || activeProjectId}
          defaultStartDate={taskModal.defaultStartDate}
          onSuccess={handleTaskSaved}
          onClose={() => setTaskModal({ open: false, task: null, anchorTaskId: null, defaultStartDate: null, projectId: null })}
        />
      )}
    </div>
  )
}
