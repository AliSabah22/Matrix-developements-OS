'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './ReviewPanel.module.css'
import AgentAvatar from '@/components/ui/AgentAvatar'
import type { Agent, AgentId, Task } from '@/types'

interface ReviewPanelProps {
  agents: Agent[]
  onRevise: (agentId: AgentId, message: string) => void
}

export default function ReviewPanel({ agents, onRevise }: ReviewPanelProps) {
  const [reviewTasks, setReviewTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [approvingIds, setApprovingIds] = useState<Set<number>>(new Set())

  const load = useCallback(() => {
    let reviewDone = false
    let allDone = false

    const checkDone = () => {
      if (reviewDone && allDone) setLoading(false)
    }

    fetch('/api/tasks?status=review')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { tasks: Task[] }) => {
        setReviewTasks(d.tasks ?? [])
        setError(false)
      })
      .catch((err) => {
        console.error('[ReviewPanel] review tasks error:', err)
        setError(true)
      })
      .finally(() => { reviewDone = true; checkDone() })

    fetch('/api/tasks')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { tasks: Task[] }) => setAllTasks(d.tasks ?? []))
      .catch((err) => console.error('[ReviewPanel] all tasks error:', err))
      .finally(() => { allDone = true; checkDone() })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleApprove = async (task: Task) => {
    setApprovingIds((prev) => new Set(prev).add(task.id))
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setReviewTasks((prev) => prev.filter((t) => t.id !== task.id))
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'done' as const } : t)))
    } catch (err) {
      console.error('[ReviewPanel] approve error:', err)
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  const handleRevise = (task: Task) => {
    onRevise(
      task.agent_id,
      `I need revisions on: ${task.title}\n\nPlease review your output for this task and improve it based on the following feedback:`
    )
  }

  const total = allTasks.length
  const done = allTasks.filter((t) => t.status === 'done').length
  const active = allTasks.filter((t) => t.status === 'active').length
  const blocked = allTasks.filter((t) => t.status === 'blocked').length

  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0
  const onTrackPct = total > 0 ? Math.round((active / total) * 100) : 0
  const agentLoad = agents.length > 0
    ? Math.min(100, Math.round((active / agents.length) * 50))
    : 0

  return (
    <div className={styles.panel}>
      <div className={styles.layout}>
        <div className={styles.reviewColumn}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>Pending Review</span>
            <span className={styles.badge}>{reviewTasks.length}</span>
          </div>

          <div className={styles.taskList}>
            {error ? (
              <div className={styles.errorMsg}>Failed to load review tasks — refresh to retry</div>
            ) : loading ? (
              <div className={styles.empty}>Loading...</div>
            ) : reviewTasks.length === 0 ? (
              <div className={styles.empty}>Nothing pending review</div>
            ) : (
              reviewTasks.map((task) => {
                const agent = agents.find((a) => a.id === task.agent_id)
                const approving = approvingIds.has(task.id)
                return (
                  <div key={task.id} className={styles.reviewCard}>
                    <div className={styles.cardTop}>
                      {agent && (
                        <AgentAvatar agentId={agent.id} color={agent.color} size={28} />
                      )}
                      <div className={styles.cardInfo}>
                        <span className={styles.cardAgent}>
                          {agent?.name ?? task.agent_id}
                        </span>
                        <span className={styles.cardTitle}>{task.title}</span>
                      </div>
                      <span className={`${styles.priorityDot} ${styles[`priority_${task.priority}`]}`} />
                    </div>

                    {task.output && (
                      <div className={styles.outputBox}>
                        <span className={styles.outputLabel}>Output</span>
                        <p className={styles.outputText}>{task.output}</p>
                      </div>
                    )}

                    <div className={styles.cardActions}>
                      <button
                        className={styles.reviseBtn}
                        onClick={() => handleRevise(task)}
                        disabled={approving}
                      >
                        Revise
                      </button>
                      <button
                        className={`${styles.approveBtn} ${approving ? styles.approving : ''}`}
                        onClick={() => handleApprove(task)}
                        disabled={approving}
                      >
                        {approving ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className={styles.healthColumn}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTitle}>Sprint Health</span>
          </div>

          <div className={styles.healthBody}>
            <div className={styles.healthMetric}>
              <div className={styles.healthLabelRow}>
                <span className={styles.healthLabel}>Completion</span>
                <span className={styles.healthPct}>{completionPct}%</span>
              </div>
              <div className={styles.bar}>
                <div className={`${styles.barFill} ${styles.barGreen}`} style={{ width: `${completionPct}%` }} />
              </div>
              <span className={styles.healthSub}>{done} of {total} tasks done</span>
            </div>

            <div className={styles.healthMetric}>
              <div className={styles.healthLabelRow}>
                <span className={styles.healthLabel}>On Track</span>
                <span className={styles.healthPct}>{onTrackPct}%</span>
              </div>
              <div className={styles.bar}>
                <div className={`${styles.barFill} ${styles.barBlue}`} style={{ width: `${onTrackPct}%` }} />
              </div>
              <span className={styles.healthSub}>{active} active, {blocked} blocked</span>
            </div>

            <div className={styles.healthMetric}>
              <div className={styles.healthLabelRow}>
                <span className={styles.healthLabel}>Agent Load</span>
                <span className={styles.healthPct}>{agentLoad}%</span>
              </div>
              <div className={styles.bar}>
                <div
                  className={`${styles.barFill} ${agentLoad > 70 ? styles.barAmber : styles.barAccent}`}
                  style={{ width: `${agentLoad}%` }}
                />
              </div>
              <span className={styles.healthSub}>{active} tasks across {agents.length} agents</span>
            </div>

            <div className={styles.divider} />

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{total}</span>
                <span className={styles.statLabel}>Total Tasks</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{done}</span>
                <span className={styles.statLabel}>Completed</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statValue} ${blocked > 0 ? styles.statRed : ''}`}>
                  {blocked}
                </span>
                <span className={styles.statLabel}>Blocked</span>
              </div>
              <div className={styles.statCard}>
                <span className={`${styles.statValue} ${reviewTasks.length > 0 ? styles.statAmber : ''}`}>
                  {reviewTasks.length}
                </span>
                <span className={styles.statLabel}>In Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
