import axios from 'axios'

const base = import.meta.env.VITE_API_BASE || ''

const api = axios.create({ baseURL: `${base}/api` })

export const getCalendar = (month) => api.get(`/calendar/?month=${month}`)
export const getEvents = () => api.get('/events/')
export const createEvent = (data) => api.post('/events/', data)
export const updateEvent = (id, data) => api.put(`/events/${id}/`, data)
export const deleteEvent = (id) => api.delete(`/events/${id}/`)

export const getTodos = () => api.get('/todos/')
export const createTodo = (data) => api.post('/todos/', data)
export const updateTodo = (id, data) => api.put(`/todos/${id}/`, data)
export const deleteTodo = (id) => api.delete(`/todos/${id}/`)
export const markTodoDone = (id) => api.post(`/todos/${id}/done/`)
export const reorderTodos = (orderedIds) => api.post('/todos/reorder/', orderedIds)

export const getProjects = () => api.get('/projects/')
export const createProject = (data) => api.post('/projects/', data)
export const updateProject = (id, data) => api.put(`/projects/${id}/`, data)
export const deleteProject = (id) => api.delete(`/projects/${id}/`)

export const getTasks = (projectId) => api.get(`/tasks/?project=${projectId}`)
export const createTask = (data) => api.post('/tasks/', data)
export const updateTask = (id, data) => api.put(`/tasks/${id}/`, data)
export const deleteTask = (id) => api.delete(`/tasks/${id}/`)
export const reorderTasks = (orderedIds) => api.post('/tasks/reorder/', orderedIds)
export const bulkUpdateTasks = (tasks) => api.post('/tasks/bulk-update/', tasks)

export const exportData = () => api.get('/data/export/')
export const importData = (data, clear = false) =>
  api.post(`/data/import/${clear ? '?clear=true' : ''}`, data)
