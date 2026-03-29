'use client'

import { useState, useEffect } from 'react'
import styles from './TasksPanel.module.css'
import TaskItem from '@/components/ui/TaskItem'
import Modal from '@/components/ui/Modal'
import type { Agent, AgentId, Task } from '@/types'

interface TasksPanelProps {
  agents: Agent[]
}

type FilterId = 'all' | 'active' | 'done' | 'blocked' | 'review'

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'review', label: 'Review' },
]

const EMPTY_MESSAGES: Record<FilterId, string> = {
  all: 'No tasks yet — create your first task',
  active: 'No active tasks',
  done: 'Nothing completed yet',
  blocked: 'No blocked tasks',
  review: 'No tasks awaiting review',
}

export default function TasksPanel({ agents }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<FilterId>('all')
  const [showModal, setShowModal] = useState(false)

  // New task form state
  const [newTitle, setNewTitle] = useState('')
  const [newAgentId, setNewAgentId] = useState<AgentId>('ceo')
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [newContext, setNewContext] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((d: { tasks: Task[] }) => setTasks(d.tasks ?? []))
      .catch((err) => console.error('[TasksPanel] load error:', err))
  }, [])

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const handleStatusChange = async (id: number, status: Task['status']) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { task: Task }
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)))
    } catch (err) {
      console.error('[TasksPanel] status change error:', err)
    }
  }

  const handleCreateTask = async () => {
    if (!newTitle.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          agentId: newAgentId,
          priority: newPriority,
          context: newContext.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { task: Task }
      setTasks((prev) => [data.task, ...prev])
      setShowModal(false)
      setNewTitle('')
      setNewAgentId('ceo')
      setNewPriority('medium')
      setNewContext('')
    } catch (err) {
      console.error('[TasksPanel] create task error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setNewTitle('')
    setNewAgentId('ceo')
    setNewPriority('medium')
    setNewContext('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`${styles.filterPill} ${filter === f.id ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id !== 'all' && (
                <span className={styles.filterCount}>
                  {tasks.filter((t) => t.status === f.id).length}
                </span>
              )}
              {f.id === 'all' && (
                <span className={styles.filterCount}>{tasks.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className={styles.newButton} onClick={() => setShowModal(true)}>
          + New Task
        </button>
      </div>

      <div className={styles.taskList}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>{EMPTY_MESSAGES[filter]}</p>
        ) : (
          filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              agents={agents}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>

      <Modal
        open={showModal}
        onClose={handleModalClose}
        title="New Task"
        actions={
          <>
            <button className={styles.cancelBtn} onClick={handleModalClose}>
              Cancel
            </button>
            <button
              className={`${styles.submitBtn} ${submitting ? styles.submitDisabled : ''}`}
              onClick={handleCreateTask}
              disabled={submitting || !newTitle.trim()}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </>
        }
      >
        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Title *</label>
          <input
            className={styles.input}
            type="text"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
            autoFocus
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Assign to</label>
          <select
            className={styles.select}
            value={newAgentId}
            onChange={(e) => setNewAgentId(e.target.value as AgentId)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.role}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Priority</label>
          <select
            className={styles.select}
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className={styles.formField}>
          <label className={styles.fieldLabel}>Context (optional)</label>
          <textarea
            className={styles.textareaField}
            placeholder="Additional context or requirements..."
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  )
}
