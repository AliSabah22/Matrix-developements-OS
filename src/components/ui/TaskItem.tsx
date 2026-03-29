'use client'

import styles from './TaskItem.module.css'
import AgentAvatar from './AgentAvatar'
import type { Task, Agent } from '@/types'

interface TaskItemProps {
  task: Task
  agents: Agent[]
  onStatusChange: (id: number, status: Task['status']) => void
}

export default function TaskItem({ task, agents, onStatusChange }: TaskItemProps) {
  const agent = agents.find((a) => a.id === task.agent_id)
  const isDone = task.status === 'done'

  const handleCheckbox = () => {
    onStatusChange(task.id, isDone ? 'active' : 'done')
  }

  return (
    <div className={`${styles.item} ${isDone ? styles.done : ''}`}>
      <button
        className={`${styles.checkbox} ${isDone ? styles.checked : ''}`}
        onClick={handleCheckbox}
        aria-label={isDone ? 'Mark as active' : 'Mark as done'}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className={styles.content}>
        <span className={`${styles.title} ${isDone ? styles.strikethrough : ''}`}>
          {task.title}
        </span>
        <div className={styles.meta}>
          {agent && (
            <div className={styles.agentPill}>
              <AgentAvatar agentId={agent.id} color={agent.color} size={14} />
              <span className={styles.agentName}>{agent.name}</span>
            </div>
          )}
          <span className={`${styles.priority} ${styles[`priority_${task.priority}`]}`}>
            {task.priority}
          </span>
          {task.status === 'blocked' && (
            <span className={styles.blockedBadge}>blocked</span>
          )}
          {task.status === 'review' && (
            <span className={styles.reviewBadge}>review</span>
          )}
        </div>
      </div>
    </div>
  )
}
