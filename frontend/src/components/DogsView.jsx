import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getDogs, createDog, updateDog, deleteDog, reorderDogs,
  getDogVisits, createDogVisit, updateDogVisit, deleteDogVisit,
  getDogStories, createDogStory, updateDogStory, deleteDogStory,
} from '../api.js'

function DogModal({ dog, onSuccess, onClose }) {
  const [form, setForm] = useState({ name: dog?.name ?? '', owner: dog?.owner ?? '', phone: dog?.phone ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const payload = { name: form.name.trim(), owner: form.owner.trim(), phone: form.phone.trim() }
    try {
      if (dog) {
        await updateDog(dog.id, { ...payload, order: dog.order })
      } else {
        await createDog({ ...payload, order: 0 })
      }
      onSuccess()
    } catch {
      setError('Failed to save dog.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{dog ? 'Edit Dog' : 'New Dog'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Dog's name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            value={form.owner}
            onChange={set('owner')}
            placeholder="Owner's name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            value={form.phone}
            onChange={set('phone')}
            placeholder="Phone number (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VisitModal({ dogId, visit, onSuccess, onClose }) {
  const [form, setForm] = useState({ start_date: visit?.start_date ?? '', end_date: visit?.end_date ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.start_date || !form.end_date) return
    setSaving(true)
    try {
      if (visit) {
        await updateDogVisit(visit.id, { dog: dogId, start_date: form.start_date, end_date: form.end_date })
      } else {
        await createDogVisit({ dog: dogId, start_date: form.start_date, end_date: form.end_date })
      }
      onSuccess()
    } catch {
      setError('Failed to save visit.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{visit ? 'Edit Visit' : 'New Visit'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start date</label>
            <input
              autoFocus
              type="date"
              value={form.start_date}
              onChange={set('start_date')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={set('end_date')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving || !form.start_date || !form.end_date}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DogsView() {
  const [dogs, setDogs] = useState([])
  const [selectedDogId, setSelectedDogId] = useState(null)
  const [visits, setVisits] = useState([])
  const [stories, setStories] = useState([])
  const [storyHeading, setStoryHeading] = useState('')
  const [storyText, setStoryText] = useState('')
  const [loadingDogs, setLoadingDogs] = useState(true)
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [loadingStories, setLoadingStories] = useState(false)
  const [savingStory, setSavingStory] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [dogModal, setDogModal] = useState({ open: false, dog: null })
  const [visitModal, setVisitModal] = useState({ open: false, visit: null })
  const storyRef = useRef(null)

  const dragDogIdx = useRef(null)
  const [dragDogOver, setDragDogOver] = useState(null)

  useEffect(() => {
    getDogs()
      .then((res) => { setDogs(res.data); setLoadingDogs(false) })
      .catch(() => setLoadingDogs(false))
  }, [])

  useEffect(() => {
    if (!selectedDogId) { setVisits([]); setStories([]); return }
    setLoadingVisits(true)
    setLoadingStories(true)
    getDogVisits(selectedDogId)
      .then((res) => { setVisits(res.data); setLoadingVisits(false) })
      .catch(() => setLoadingVisits(false))
    getDogStories(selectedDogId)
      .then((res) => { setStories(res.data); setLoadingStories(false) })
      .catch(() => setLoadingStories(false))
  }, [selectedDogId])

  const handleDogSuccess = () => {
    setDogModal({ open: false, dog: null })
    getDogs().then((res) => setDogs(res.data))
  }

  const handleDeleteDog = async (id) => {
    if (!confirm('Delete this dog and all their visits and stories?')) return
    await deleteDog(id)
    setDogs((d) => d.filter((x) => x.id !== id))
    if (selectedDogId === id) setSelectedDogId(null)
  }

  const handleVisitSuccess = () => {
    setVisitModal({ open: false, visit: null })
    if (selectedDogId) getDogVisits(selectedDogId).then((res) => setVisits(res.data))
  }

  const handleDeleteVisit = async (id) => {
    if (!confirm('Delete this visit?')) return
    await deleteDogVisit(id)
    setVisits((v) => v.filter((x) => x.id !== id))
  }

  const handleAddStory = async (e) => {
    e.preventDefault()
    if (!storyHeading.trim() || !selectedDogId) return
    setSavingStory(true)
    try {
      const res = await createDogStory({ dog: selectedDogId, heading: storyHeading.trim(), text: storyText.trim() })
      setStories((s) => [res.data, ...s])
      setStoryHeading('')
      setStoryText('')
      storyRef.current?.focus()
    } finally {
      setSavingStory(false)
    }
  }

  const handleDeleteStory = async (id) => {
    if (!confirm('Delete this story?')) return
    await deleteDogStory(id)
    setStories((s) => s.filter((x) => x.id !== id))
  }

  const handleSaveStory = async (e) => {
    e.preventDefault()
    if (!editingStory) return
    const res = await updateDogStory(editingStory.id, { heading: editingStory.heading, text: editingStory.text })
    setStories((s) => s.map((x) => x.id === editingStory.id ? res.data : x))
    setEditingStory(null)
  }

  const handleStoryKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddStory(e) }
  }

  const handleDogDragStart = (idx) => { dragDogIdx.current = idx }
  const handleDogDragOver = (e, idx) => { e.preventDefault(); setDragDogOver(idx) }
  const handleDogDragEnd = () => { dragDogIdx.current = null; setDragDogOver(null) }
  const handleDogDrop = async (targetIdx) => {
    const from = dragDogIdx.current
    setDragDogOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...dogs]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragDogIdx.current = null
    setDogs(reordered)
    await reorderDogs(reordered.map((d) => d.id))
  }

  const selectedDog = dogs.find((d) => d.id === selectedDogId) ?? null

  return (
    <div className="flex gap-4 items-start">
      {/* Dogs panel */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Dogs</h3>
          <button
            onClick={() => setDogModal({ open: true, dog: null })}
            className="text-orange-500 hover:text-orange-600 text-xl leading-none font-light"
            title="Add dog"
          >+</button>
        </div>
        {loadingDogs ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : dogs.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No dogs yet.</p>
        ) : (
          <ul>
            {dogs.map((dog, idx) => (
              <li
                key={dog.id}
                draggable
                onDragStart={() => handleDogDragStart(idx)}
                onDragOver={(e) => handleDogDragOver(e, idx)}
                onDragEnd={handleDogDragEnd}
                onDrop={() => handleDogDrop(idx)}
                className={`relative flex items-center gap-1 px-2 py-2 cursor-pointer group border-b border-gray-50 last:border-0 ${selectedDogId === dog.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedDogId(dog.id)}
              >
                {dragDogOver === idx && dragDogIdx.current !== idx && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-orange-400 pointer-events-none" />
                )}
                <span className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-xs shrink-0" title="Drag to reorder">⠿</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedDogId === dog.id ? 'text-orange-700 font-medium' : 'text-gray-700'}`}>{dog.name}</p>
                  <p className="text-xs text-gray-400 truncate">{dog.owner}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDogModal({ open: true, dog }) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDog(dog.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
                  title="Delete"
                >&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visits panel */}
      <div className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            {selectedDog ? `Visits — ${selectedDog.name}` : 'Visits'}
          </h3>
          {selectedDogId && (
            <button
              onClick={() => setVisitModal({ open: true, visit: null })}
              className="text-orange-500 hover:text-orange-600 text-xl leading-none font-light"
              title="Add visit"
            >+</button>
          )}
        </div>
        {!selectedDogId ? (
          <p className="text-xs text-gray-400 px-4 py-3">Select a dog.</p>
        ) : loadingVisits ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No visits yet.</p>
        ) : (
          <ul>
            {visits.map((visit) => (
              <li
                key={visit.id}
                className="flex items-center gap-1 px-3 py-2 group border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    {format(parseISO(visit.start_date), 'd MMM yyyy')}
                    {visit.start_date !== visit.end_date && (
                      <span className="text-gray-400"> → {format(parseISO(visit.end_date), 'd MMM yyyy')}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setVisitModal({ open: true, visit })}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={() => handleDeleteVisit(visit.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
                  title="Delete"
                >&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stories panel */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            {selectedDog ? `Stories — ${selectedDog.name}` : 'Stories'}
          </h3>
          {selectedDog?.owner && (
            <p className="text-xs text-gray-500 mt-0.5">Owner: {selectedDog.owner}{selectedDog.phone ? ` · ${selectedDog.phone}` : ''}</p>
          )}
        </div>

        {!selectedDogId ? (
          <p className="text-xs text-gray-400 px-5 py-4">Select a dog to see their stories.</p>
        ) : (
          <div className="p-5">
            <form onSubmit={handleAddStory} className="mb-6 space-y-2">
              <input
                type="text"
                value={storyHeading}
                onChange={(e) => setStoryHeading(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); storyRef.current?.focus() } }}
                placeholder="Heading"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <textarea
                ref={storyRef}
                rows={3}
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                onKeyDown={handleStoryKeyDown}
                placeholder="Story…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Enter in story to submit · Shift+Enter for new line</p>
                <button
                  type="submit"
                  disabled={savingStory || !storyHeading.trim()}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingStory ? 'Saving…' : 'Add'}
                </button>
              </div>
            </form>

            {loadingStories ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : stories.length === 0 ? (
              <p className="text-xs text-gray-400">No stories yet.</p>
            ) : (
              <ul className="space-y-3">
                {stories.map((story) => (
                  <li key={story.id} className="relative bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 group">
                    {editingStory?.id === story.id ? (
                      <form onSubmit={handleSaveStory} className="space-y-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingStory.heading}
                          onChange={(e) => setEditingStory((s) => ({ ...s, heading: e.target.value }))}
                          placeholder="Heading"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <textarea
                          rows={4}
                          value={editingStory.text}
                          onChange={(e) => setEditingStory((s) => ({ ...s, text: e.target.value }))}
                          placeholder="Story…"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingStory(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">Save</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {story.heading && <p className="text-gray-800 text-sm font-semibold mb-1">{story.heading}</p>}
                          {story.text && <p className="text-gray-700 text-sm whitespace-pre-wrap">{story.text}</p>}
                          <p className="text-xs text-gray-400 mt-1">{format(parseISO(story.created_at), 'EEE d MMM yyyy, h:mm a')}</p>
                        </div>
                        <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 mt-0.5">
                          <button
                            onClick={() => setEditingStory({ id: story.id, heading: story.heading, text: story.text })}
                            className="text-gray-400 hover:text-orange-500 transition-colors text-xs px-1"
                            title="Edit"
                          >✎</button>
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                            title="Delete"
                          >&times;</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {dogModal.open && (
        <DogModal
          dog={dogModal.dog}
          onSuccess={handleDogSuccess}
          onClose={() => setDogModal({ open: false, dog: null })}
        />
      )}

      {visitModal.open && (
        <VisitModal
          dogId={selectedDogId}
          visit={visitModal.visit}
          onSuccess={handleVisitSuccess}
          onClose={() => setVisitModal({ open: false, visit: null })}
        />
      )}
    </div>
  )
}
