import { useCallback, useEffect, useRef, useState } from 'react'
import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns'

const DAY_W = 28
const ROW_H = 44
const HDR_H = 52
const SIDEBAR_W = 172
const HANDLE_W = 8
const LINK_R = 5
const TOTAL_DAYS = 180

const CHART_START = startOfDay(new Date())

function px(n) { return `${n}px` }

// ─── pure helpers ────────────────────────────────────────────────────────────

function d2x(dateStr) {
  return differenceInDays(parseISO(dateStr), CHART_START) * DAY_W
}

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

// ─── Date header ─────────────────────────────────────────────────────────────

function DateHeader() {
  const months = []
  let cur = null
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = addDays(CHART_START, i)
    const key = format(d, 'yyyy-MM')
    if (!cur || cur.key !== key) { cur = { key, label: format(d, 'MMM yyyy'), count: 0 }; months.push(cur) }
    cur.count++
  }
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <div style={{ width: px(TOTAL_DAYS * DAY_W), flexShrink: 0 }}>
      {/* month row */}
      <div style={{ display: 'flex', height: px(24), borderBottom: '1px solid #e5e7eb' }}>
        {months.map(m => (
          <div key={m.key} style={{ width: px(m.count * DAY_W), flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#6b7280', padding: '4px 6px', borderRight: '1px solid #e5e7eb', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {m.label}
          </div>
        ))}
      </div>
      {/* day row */}
      <div style={{ display: 'flex', height: px(HDR_H - 24) }}>
        {Array.from({ length: TOTAL_DAYS }, (_, i) => {
          const d = addDays(CHART_START, i)
          const ds = format(d, 'yyyy-MM-dd')
          const dow = d.getDay()
          const isToday = ds === todayStr
          const weekend = dow === 0 || dow === 6
          return (
            <div key={i} style={{ width: px(DAY_W), flexShrink: 0, fontSize: 10, textAlign: 'center', lineHeight: px(HDR_H - 24), borderRight: '1px solid #f3f4f6', background: isToday ? '#eff6ff' : weekend ? '#f9fafb' : 'transparent', color: isToday ? '#2563eb' : weekend ? '#9ca3af' : '#9ca3af', fontWeight: isToday ? 700 : 400 }}>
              {format(d, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GanttChart({ tasks: propTasks, onSave, onDependencyCreate, onDeleteLink, onTaskEdit, selectedTaskId, onTaskSelect, onTaskDone }) {
  const [localTasks, setLocalTasks] = useState(propTasks)
  const [tooltip, setTooltip] = useState(null)   // { text, x, y }
  const [linkDrag, setLinkDrag] = useState(null)  // { fromId, x, y }
  const [linkHover, setLinkHover] = useState(null)
  const [selectedArrow, setSelectedArrow] = useState(null) // { key, dependentId }

  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const localTasksRef = useRef(propTasks)
  const lastDraggedRef = useRef(false)

  useEffect(() => { setLocalTasks(propTasks); localTasksRef.current = propTasks }, [propTasks])
  useEffect(() => { localTasksRef.current = localTasks }, [localTasks])

  // ── coordinate helpers ──────────────────────────────────────────────────────

  const getRect = () => containerRef.current?.getBoundingClientRect()
  const scrollX = () => containerRef.current?.scrollLeft ?? 0
  const scrollY = () => containerRef.current?.scrollTop ?? 0

  const mouseChartX = (e) => e.clientX - (getRect()?.left ?? 0) + scrollX() - SIDEBAR_W
  const mouseChartY = (e) => e.clientY - (getRect()?.top ?? 0) + scrollY() - HDR_H

  // ── drag initiators ─────────────────────────────────────────────────────────

  const startBarDrag = (e, taskId, dtype) => {
    e.preventDefault(); e.stopPropagation()
    const task = localTasksRef.current.find(t => t.id === taskId)
    lastDraggedRef.current = false
    dragRef.current = {
      type: dtype, taskId,
      startMouseX: e.clientX, startMouseY: e.clientY,
      origStart: task.start_date, origEnd: task.end_date,
      snapshot: localTasksRef.current.map(t => ({ ...t })),
      origIdx: localTasksRef.current.findIndex(t => t.id === taskId),
      curIdx: null,
    }
  }

  const startLinkDrag = (e, taskId) => {
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { type: 'link', fromId: taskId }
    const rect = getRect()
    setLinkDrag({ fromId: taskId, x: mouseChartX(e), y: mouseChartY(e) })
  }

  // ── document mouse handlers ─────────────────────────────────────────────────

  const handleMouseMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return

    if (Math.abs(e.clientX - drag.startMouseX) > 3 || Math.abs(e.clientY - (drag.startMouseY ?? e.clientY)) > 3) {
      lastDraggedRef.current = true
    }

    if (drag.type === 'link') {
      setLinkDrag({ fromId: drag.fromId, x: mouseChartX(e), y: mouseChartY(e) })
      const chartY = mouseChartY(e)
      const idx = Math.floor(chartY / ROW_H)
      const tasks = localTasksRef.current
      const hov = idx >= 0 && idx < tasks.length ? tasks[idx].id : null
      setLinkHover(hov === drag.fromId ? null : hov)
      return
    }

    const dx = e.clientX - drag.startMouseX
    const delta = Math.round(dx / DAY_W)

    if (drag.type === 'resize-left') {
      setLocalTasks(prev => {
        const newStart = format(addDays(parseISO(drag.origStart), delta), 'yyyy-MM-dd')
        if (newStart >= drag.origEnd) return prev
        return prev.map(t => t.id === drag.taskId ? { ...t, start_date: newStart } : t)
      })
    } else if (drag.type === 'resize-right') {
      setLocalTasks(prev => {
        const newEndDate = addDays(parseISO(drag.origEnd), delta)
        const newEnd = format(newEndDate, 'yyyy-MM-dd')
        if (newEnd <= drag.origStart) return prev
        let u = prev.map(t => t.id === drag.taskId ? { ...t, end_date: newEnd } : t)
        return cascadeFrom(u, drag.taskId, newEndDate)
      })
    } else if (drag.type === 'move') {
      setLocalTasks(prev => {
        const dur = differenceInDays(parseISO(drag.origEnd), parseISO(drag.origStart))
        const newStartDate = addDays(parseISO(drag.origStart), delta)
        const newEndDate = addDays(newStartDate, dur)
        let u = prev.map(t => t.id === drag.taskId
          ? { ...t, start_date: format(newStartDate, 'yyyy-MM-dd'), end_date: format(newEndDate, 'yyyy-MM-dd') }
          : t)
        return cascadeFrom(u, drag.taskId, newEndDate)
      })
    } else if (drag.type === 'reorder') {
      const dy = e.clientY - drag.startMouseY
      const newIdx = Math.max(0, Math.min(drag.snapshot.length - 1, drag.origIdx + Math.round(dy / ROW_H)))
      if (newIdx !== drag.curIdx) {
        drag.curIdx = newIdx
        const arr = drag.snapshot.map(t => ({ ...t }))
        const [moved] = arr.splice(drag.origIdx, 1)
        arr.splice(newIdx, 0, moved)
        setLocalTasks(arr)
      }
    }
  }, [])

  const handleMouseUp = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null

    if (drag.type === 'link') {
      const tasks = localTasksRef.current
      const idx = Math.floor(mouseChartY(e) / ROW_H)
      if (idx >= 0 && idx < tasks.length) {
        const target = tasks[idx]
        if (target.id !== drag.fromId) onDependencyCreate(target.id, drag.fromId)
      }
      setLinkDrag(null); setLinkHover(null)
      return
    }

    if (drag.type === 'reorder') {
      onSave(localTasksRef.current, 'reorder')
    } else {
      onSave(localTasksRef.current, 'dates')
    }
  }, [onSave, onDependencyCreate])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Delete' && selectedArrow) {
        onDeleteLink(selectedArrow.dependentId)
        setSelectedArrow(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedArrow, onDeleteLink])

  // ── dependency arrows ───────────────────────────────────────────────────────

  const arrows = localTasks
    .filter(t => t.depends_on != null)
    .flatMap(t => {
      const pred = localTasks.find(p => p.id === t.depends_on)
      if (!pred) return []
      const pi = localTasks.indexOf(pred), di = localTasks.indexOf(t)
      const x1 = d2x(pred.end_date) + DAY_W
      const y1 = pi * ROW_H + ROW_H / 2
      const x2 = d2x(t.start_date)
      const y2 = di * ROW_H + ROW_H / 2
      return [{ key: `${pred.id}-${t.id}`, dependentId: t.id, x1, y1, x2, y2 }]
    })

  const totalH = Math.max(localTasks.length * ROW_H, 1)

  return (
    <div ref={containerRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '72vh', border: '1px solid #e5e7eb', borderRadius: 8, position: 'relative', background: 'white' }}>
      <div style={{ width: px(SIDEBAR_W + TOTAL_DAYS * DAY_W), minWidth: '100%' }}>

        {/* ── sticky header ── */}
        <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #e5e7eb', height: px(HDR_H) }}>
          <div style={{ width: px(SIDEBAR_W), flexShrink: 0, position: 'sticky', left: 0, zIndex: 30, background: '#f9fafb', borderRight: '1px solid #e5e7eb' }} />
          <DateHeader />
        </div>

        {/* ── body ── */}
        <div style={{ position: 'relative' }}>

          {/* SVG overlay for arrows */}
          <svg style={{ position: 'absolute', left: px(SIDEBAR_W), top: 0, width: px(TOTAL_DAYS * DAY_W), height: px(totalH), zIndex: 5, overflow: 'visible' }}
            onClick={() => setSelectedArrow(null)}>
            <defs>
              <marker id="arr" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0,7 2.5,0 5" fill="#6366f1" />
              </marker>
              <marker id="arr-red" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0,7 2.5,0 5" fill="#ef4444" />
              </marker>
            </defs>
            {/* Live link drag line */}
            {linkDrag && (() => {
              const from = localTasks.find(t => t.id === linkDrag.fromId)
              if (!from) return null
              const fi = localTasks.indexOf(from)
              const x1 = d2x(from.end_date) + DAY_W + LINK_R * 2 + 4
              const y1 = fi * ROW_H + ROW_H / 2
              return <line x1={x1} y1={y1} x2={linkDrag.x} y2={linkDrag.y} stroke="#6366f1" strokeWidth={2} strokeDasharray="5 3" pointerEvents="none" />
            })()}
            {/* Dependency arrows — click to select, Delete key to remove */}
            {arrows.map(a => {
              const sel = selectedArrow?.key === a.key
              const d = `M ${a.x1} ${a.y1} C ${a.x1 + 36} ${a.y1} ${a.x2 - 36} ${a.y2} ${a.x2} ${a.y2}`
              return (
                <g key={a.key} style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedArrow(sel ? null : { key: a.key, dependentId: a.dependentId }) }}
                >
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  <path d={d} fill="none" stroke={sel ? '#ef4444' : '#6366f1'} strokeWidth={1.5} markerEnd={sel ? 'url(#arr-red)' : 'url(#arr)'} />
                </g>
              )
            })}
          </svg>

          {/* Task rows */}
          {localTasks.map((task, idx) => {
            const barL = d2x(task.start_date)
            const barR = d2x(task.end_date) + DAY_W
            const barW = Math.max(DAY_W, barR - barL)
            const isLinkTarget = linkHover === task.id
            const isSelected = selectedTaskId === task.id

            return (
              <div key={task.id} style={{ display: 'flex', height: px(ROW_H), borderBottom: '1px solid #f3f4f6' }}>

                {/* Sidebar */}
                <div
                  onClick={() => onTaskSelect(isSelected ? null : task.id)}
                  style={{ width: px(SIDEBAR_W), flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRight: '1px solid #e5e7eb', borderLeft: isSelected ? '3px solid #4f46e5' : '3px solid transparent', position: 'sticky', left: 0, background: isSelected ? '#eef2ff' : 'white', zIndex: 10, cursor: 'pointer' }}>
                  <span
                    style={{ cursor: 'grab', color: '#d1d5db', fontSize: 15, userSelect: 'none', flexShrink: 0 }}
                    onMouseDown={(e) => { e.stopPropagation(); startBarDrag(e, task.id, 'reorder') }}
                  >⠿</span>
                  <span
                    style={{ fontSize: 13, color: task.completed ? '#9ca3af' : isSelected ? '#4338ca' : '#374151', fontWeight: isSelected ? 600 : 400, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, textDecoration: task.completed ? 'line-through' : 'none' }}
                    onDoubleClick={(e) => { e.stopPropagation(); onTaskEdit(task) }}
                    title="Double-click to edit"
                  >{task.name}</span>
                  {onTaskDone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onTaskDone(task.id) }}
                      style={{ flexShrink: 0, fontSize: 13, color: task.completed ? '#9ca3af' : '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                      title={task.completed ? 'Mark incomplete' : 'Mark done'}
                    >✓</button>
                  )}
                </div>

                {/* Chart lane */}
                <div style={{ width: px(TOTAL_DAYS * DAY_W), height: px(ROW_H), position: 'relative', flexShrink: 0 }}>

                  {/* Weekend shading */}
                  {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                    const d = addDays(CHART_START, i)
                    const dow = d.getDay()
                    if (dow !== 0 && dow !== 6) return null
                    return <div key={i} style={{ position: 'absolute', left: px(i * DAY_W), top: 0, width: px(DAY_W), height: '100%', background: '#f9fafb', zIndex: 0 }} />
                  })}

                  {/* Task bar */}
                  <div
                    style={{ position: 'absolute', top: px(12), left: px(barL), width: px(barW), height: px(ROW_H - 24), background: task.completed ? '#d1d5db' : isLinkTarget ? '#818cf8' : isSelected ? '#6366f1' : '#4f46e5', borderRadius: 4, display: 'flex', alignItems: 'center', userSelect: 'none', zIndex: 6, boxShadow: isSelected ? '0 0 0 2px #a5b4fc' : '0 1px 3px rgba(0,0,0,.15)', cursor: 'move' }}
                    onClick={() => { if (!lastDraggedRef.current) onTaskSelect(isSelected ? null : task.id) }}
                    onMouseDown={(e) => {
                      const localX = e.clientX - e.currentTarget.getBoundingClientRect().left
                      const w = e.currentTarget.getBoundingClientRect().width
                      if (localX < HANDLE_W) startBarDrag(e, task.id, 'resize-left')
                      else if (localX > w - HANDLE_W) startBarDrag(e, task.id, 'resize-right')
                      else startBarDrag(e, task.id, 'move')
                    }}
                    onMouseEnter={() => { if (task.description && !dragRef.current) setTooltip({ id: task.id }) }}
                    onMouseMove={(e) => {
                      if (task.description && !dragRef.current) {
                        const rect = getRect()
                        setTooltip({ id: task.id, text: task.description, x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 14 })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onDoubleClick={() => onTaskEdit(task)}
                  >
                    <div style={{ width: px(HANDLE_W), height: '100%', cursor: 'ew-resize', flexShrink: 0, borderRadius: '4px 0 0 4px' }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ width: px(HANDLE_W), height: '100%', cursor: 'ew-resize', flexShrink: 0, borderRadius: '0 4px 4px 0' }} />
                  </div>

                  {/* Link handle */}
                  <div
                    style={{ position: 'absolute', top: px(ROW_H / 2 - LINK_R), left: px(barR + 4), width: px(LINK_R * 2), height: px(LINK_R * 2), borderRadius: '50%', background: '#e0e7ff', border: '2px solid #6366f1', cursor: 'crosshair', zIndex: 7 }}
                    onMouseDown={(e) => startLinkDrag(e, task.id)}
                    title="Drag to link to another task"
                  />
                </div>
              </div>
            )
          })}

          {localTasks.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              No tasks yet — click <strong>+ Add Task</strong> to get started.
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip?.text && (
        <div style={{ position: 'fixed', left: px(tooltip.x + (getRect()?.left ?? 0)), top: px(tooltip.y + (getRect()?.top ?? 0)), background: '#1f2937', color: 'white', fontSize: 12, padding: '6px 10px', borderRadius: 6, maxWidth: 260, whiteSpace: 'pre-wrap', pointerEvents: 'none', zIndex: 9999, boxShadow: '0 4px 8px rgba(0,0,0,.3)' }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
