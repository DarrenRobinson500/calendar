import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  getPeopleGroups, createPeopleGroup, updatePeopleGroup, deletePeopleGroup, reorderPeopleGroups,
  getPeople, createPerson, updatePerson, deletePerson, reorderPeople,
  getStories, createStory, updateStory, deleteStory,
} from '../api.js'

function GroupModal({ group, onSuccess, onClose }) {
  const [name, setName] = useState(group?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (group) {
        await updatePeopleGroup(group.id, { name: name.trim(), order: group.order })
      } else {
        await createPeopleGroup({ name: name.trim(), order: 0 })
      }
      onSuccess()
    } catch {
      setError('Failed to save group.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{group ? 'Edit Group' : 'New Group'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
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

function PersonModal({ groupId, person, onSuccess, onClose }) {
  const [form, setForm] = useState({ name: person?.name ?? '', notes: person?.notes ?? '', birthday: person?.birthday ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      notes: form.notes,
      birthday: form.birthday || null,
    }
    try {
      if (person) {
        await updatePerson(person.id, { ...payload, group: person.group, order: person.order })
      } else {
        await createPerson({ ...payload, group: groupId, order: 0 })
      }
      onSuccess()
    } catch {
      setError('Failed to save person.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">{person ? 'Edit Person' : 'New Person'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Birthday (optional)</label>
            <input
              type="date"
              value={form.birthday}
              onChange={set('birthday')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <textarea
            rows={3}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Notes (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end gap-2">
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

export default function PeopleView() {
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [people, setPeople] = useState([])
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [stories, setStories] = useState([])
  const [storyHeading, setStoryHeading] = useState('')
  const [storyText, setStoryText] = useState('')
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [loadingStories, setLoadingStories] = useState(false)
  const [savingStory, setSavingStory] = useState(false)
  const [editingStory, setEditingStory] = useState(null)
  const [groupModal, setGroupModal] = useState({ open: false, group: null })
  const [personModal, setPersonModal] = useState({ open: false, person: null })
  const storyRef = useRef(null)

  // drag state for groups
  const dragGroupIdx = useRef(null)
  const [dragGroupOver, setDragGroupOver] = useState(null)

  // drag state for people
  const dragPersonIdx = useRef(null)
  const [dragPersonOver, setDragPersonOver] = useState(null)

  useEffect(() => {
    getPeopleGroups()
      .then((res) => { setGroups(res.data); setLoadingGroups(false) })
      .catch(() => setLoadingGroups(false))
  }, [])

  useEffect(() => {
    if (!selectedGroupId) { setPeople([]); setSelectedPersonId(null); return }
    setLoadingPeople(true)
    getPeople(selectedGroupId)
      .then((res) => { setPeople(res.data); setLoadingPeople(false) })
      .catch(() => setLoadingPeople(false))
  }, [selectedGroupId])

  useEffect(() => {
    if (!selectedPersonId) { setStories([]); return }
    setLoadingStories(true)
    getStories(selectedPersonId)
      .then((res) => { setStories(res.data); setLoadingStories(false) })
      .catch(() => setLoadingStories(false))
  }, [selectedPersonId])

  const handleGroupSuccess = () => {
    setGroupModal({ open: false, group: null })
    getPeopleGroups().then((res) => setGroups(res.data))
  }

  const handleDeleteGroup = async (id) => {
    if (!confirm('Delete this group and all its people?')) return
    await deletePeopleGroup(id)
    setGroups((g) => g.filter((x) => x.id !== id))
    if (selectedGroupId === id) { setSelectedGroupId(null); setSelectedPersonId(null) }
  }

  const handlePersonSuccess = () => {
    setPersonModal({ open: false, person: null })
    if (selectedGroupId) getPeople(selectedGroupId).then((res) => setPeople(res.data))
  }

  const handleDeletePerson = async (id) => {
    if (!confirm('Delete this person and all their stories?')) return
    await deletePerson(id)
    setPeople((p) => p.filter((x) => x.id !== id))
    if (selectedPersonId === id) setSelectedPersonId(null)
  }

  const handleAddStory = async (e) => {
    e.preventDefault()
    if (!storyHeading.trim() || !selectedPersonId) return
    setSavingStory(true)
    try {
      const res = await createStory({ person: selectedPersonId, heading: storyHeading.trim(), text: storyText.trim() })
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
    await deleteStory(id)
    setStories((s) => s.filter((x) => x.id !== id))
  }

  const handleSaveStory = async (e) => {
    e.preventDefault()
    if (!editingStory) return
    const res = await updateStory(editingStory.id, { heading: editingStory.heading, text: editingStory.text })
    setStories((s) => s.map((x) => x.id === editingStory.id ? res.data : x))
    setEditingStory(null)
  }

  const handleStoryKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddStory(e) }
  }

  // group drag-to-reorder
  const handleGroupDragStart = (idx) => { dragGroupIdx.current = idx }
  const handleGroupDragOver = (e, idx) => { e.preventDefault(); setDragGroupOver(idx) }
  const handleGroupDragEnd = () => { dragGroupIdx.current = null; setDragGroupOver(null) }
  const handleGroupDrop = async (targetIdx) => {
    const from = dragGroupIdx.current
    setDragGroupOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...groups]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragGroupIdx.current = null
    setGroups(reordered)
    await reorderPeopleGroups(reordered.map((g) => g.id))
  }

  // people drag-to-reorder
  const handlePersonDragStart = (idx) => { dragPersonIdx.current = idx }
  const handlePersonDragOver = (e, idx) => { e.preventDefault(); setDragPersonOver(idx) }
  const handlePersonDragEnd = () => { dragPersonIdx.current = null; setDragPersonOver(null) }
  const handlePersonDrop = async (targetIdx) => {
    const from = dragPersonIdx.current
    setDragPersonOver(null)
    if (from === null || from === targetIdx) return
    const reordered = [...people]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIdx, 0, moved)
    dragPersonIdx.current = null
    setPeople(reordered)
    await reorderPeople(reordered.map((p) => p.id))
  }

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null
  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null

  return (
    <div className="flex gap-4 items-start">
      {/* Groups panel */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Groups</h3>
          <button
            onClick={() => setGroupModal({ open: true, group: null })}
            className="text-blue-600 hover:text-blue-700 text-xl leading-none font-light"
            title="Add group"
          >+</button>
        </div>
        {loadingGroups ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No groups yet.</p>
        ) : (
          <ul>
            {groups.map((group, idx) => (
              <li
                key={group.id}
                draggable
                onDragStart={() => handleGroupDragStart(idx)}
                onDragOver={(e) => handleGroupDragOver(e, idx)}
                onDragEnd={handleGroupDragEnd}
                onDrop={() => handleGroupDrop(idx)}
                className={`relative flex items-center gap-1 px-2 py-2 cursor-pointer group border-b border-gray-50 last:border-0 ${selectedGroupId === group.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => { setSelectedGroupId(group.id); setSelectedPersonId(null) }}
              >
                {dragGroupOver === idx && dragGroupIdx.current !== idx && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-blue-500 pointer-events-none" />
                )}
                <span className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-xs shrink-0" title="Drag to reorder">⠿</span>
                <span className={`flex-1 text-sm truncate ${selectedGroupId === group.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{group.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setGroupModal({ open: true, group }) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-base leading-none"
                  title="Delete"
                >&times;</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* People panel */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">
            {selectedGroup ? selectedGroup.name : 'People'}
          </h3>
          {selectedGroupId && (
            <button
              onClick={() => setPersonModal({ open: true, person: null })}
              className="text-blue-600 hover:text-blue-700 text-xl leading-none font-light"
              title="Add person"
            >+</button>
          )}
        </div>
        {!selectedGroupId ? (
          <p className="text-xs text-gray-400 px-4 py-3">Select a group.</p>
        ) : loadingPeople ? (
          <p className="text-xs text-gray-400 px-4 py-3">Loading…</p>
        ) : people.length === 0 ? (
          <p className="text-xs text-gray-400 px-4 py-3">No people yet.</p>
        ) : (
          <ul>
            {people.map((person, idx) => (
              <li
                key={person.id}
                draggable
                onDragStart={() => handlePersonDragStart(idx)}
                onDragOver={(e) => handlePersonDragOver(e, idx)}
                onDragEnd={handlePersonDragEnd}
                onDrop={() => handlePersonDrop(idx)}
                className={`relative flex items-center gap-1 px-2 py-2 cursor-pointer group border-b border-gray-50 last:border-0 ${selectedPersonId === person.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedPersonId(person.id)}
              >
                {dragPersonOver === idx && dragPersonIdx.current !== idx && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-blue-500 pointer-events-none" />
                )}
                <span className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing select-none text-xs shrink-0" title="Drag to reorder">⠿</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${selectedPersonId === person.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{person.name}</p>
                  {person.birthday && <p className="text-xs text-gray-400 truncate">{format(parseISO(person.birthday), 'd MMM yyyy')}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPersonModal({ open: true, person }) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 text-xs px-1"
                  title="Edit"
                >✎</button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePerson(person.id) }}
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
            {selectedPerson ? `Stories — ${selectedPerson.name}` : 'Stories'}
          </h3>
          {selectedPerson?.birthday && (
            <p className="text-xs text-gray-500 mt-0.5">Birthday: {format(parseISO(selectedPerson.birthday), 'd MMMM yyyy')}</p>
          )}
          {selectedPerson?.notes && (
            <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{selectedPerson.notes}</p>
          )}
        </div>

        {!selectedPersonId ? (
          <p className="text-xs text-gray-400 px-5 py-4">Select a person to see their stories.</p>
        ) : (
          <div className="p-5">
            <form onSubmit={handleAddStory} className="mb-6 space-y-2">
              <input
                type="text"
                value={storyHeading}
                onChange={(e) => setStoryHeading(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); storyRef.current?.focus() } }}
                placeholder="Heading"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                ref={storyRef}
                rows={3}
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                onKeyDown={handleStoryKeyDown}
                placeholder="Story…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Enter in story to submit · Shift+Enter for new line</p>
                <button
                  type="submit"
                  disabled={savingStory || !storyHeading.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          rows={4}
                          value={editingStory.text}
                          onChange={(e) => setEditingStory((s) => ({ ...s, text: e.target.value }))}
                          placeholder="Story…"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingStory(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                          <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
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
                            className="text-gray-400 hover:text-blue-500 transition-colors text-xs px-1"
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

      {groupModal.open && (
        <GroupModal
          group={groupModal.group}
          onSuccess={handleGroupSuccess}
          onClose={() => setGroupModal({ open: false, group: null })}
        />
      )}

      {personModal.open && (
        <PersonModal
          groupId={selectedGroupId}
          person={personModal.person}
          onSuccess={handlePersonSuccess}
          onClose={() => setPersonModal({ open: false, person: null })}
        />
      )}
    </div>
  )
}
