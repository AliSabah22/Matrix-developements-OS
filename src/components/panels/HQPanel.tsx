'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './HQPanel.module.css'
import AgentAvatar from '@/components/ui/AgentAvatar'
import StatusBadge from '@/components/ui/StatusBadge'
import { relativeTime } from '@/utils/time'
import type { Agent, AgentId, Task, Activity, BadgeStatus } from '@/types'

interface HQPanelProps {
  agents: Agent[]
  onNavigateToChat: (agentId: AgentId) => void
}

const AGENT_BADGE_STATUS: Record<AgentId, BadgeStatus> = {
  ceo: 'working',
  coo: 'working',
  cto: 'reviewing',
  cmo: 'idle',
  cpo: 'working',
  cfo: 'idle',
  engineer: 'working',
}

const TYPE_LABELS: Record<Activity['type'], string> = {
  done: 'done',
  alert: 'alert',
  updated: 'update',
  report: 'report',
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z')
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export default function HQPanel({ agents, onNavigateToChat }: HQPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksError, setTasksError] = useState(false)
  const [activityError, setActivityError] = useState(false)

  const load = useCallback(() => {
    fetch('/api/tasks')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { tasks: Task[] }) => {
        setTasks(d.tasks ?? [])
        setTasksError(false)
      })
      .catch((err) => {
        console.error('[HQPanel] tasks error:', err)
        setTasksError(true)
      })

    fetch('/api/activity?limit=8')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: { activity: Activity[] }) => {
        setActivity(d.activity ?? [])
        setActivityError(false)
      })
      .catch((err) => {
        console.error('[HQPanel] activity error:', err)
        setActivityError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const totalToday = tasks.filter((t) => isToday(t.created_at)).length
  const completed = tasks.filter((t) => t.status === 'done').length
  const pendingReview = tasks.filter((t) => t.status === 'review').length
  const sprintProgress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0

  return (
    <div className={styles.panel}>
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Tasks Today</span>
          <span className={styles.metricValue}>{loading ? '—' : totalToday}</span>
          <span className={styles.metricSub}>
            {loading ? 'Loading...' : completed > 0 ? `${completed} completed` : 'none completed yet'}
          </span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Active Agents</span>
          <span className={styles.metricValue}>{agents.length}</span>
          <span className={styles.metricSubGreen}>All systems go</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Pending Review</span>
          <span className={styles.metricValue}>{loading ? '—' : pendingReview}</span>
          {!loading && pendingReview > 0 ? (
            <span className={styles.metricSubAmber}>Needs your approval</span>
          ) : (
            <span className={styles.metricSub}>{loading ? 'Loading...' : 'Nothing pending'}</span>
          )}
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Sprint Progress</span>
          <span className={styles.metricValue}>{loading ? '—' : `${sprintProgress}%`}</span>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: loading ? '0%' : `${sprintProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.activityCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Live Activity</span>
            <span className={styles.badge}>real-time</span>
          </div>
          <div className={styles.activityList}>
            {activityError ? (
              <p className={styles.errorMsg}>Failed to load activity — refresh to retry</p>
            ) : loading ? (
              <p className={styles.empty}>Loading...</p>
            ) : activity.length === 0 ? (
              <p className={styles.empty}>No activity yet — start chatting with an agent</p>
            ) : (
              activity.map((item) => {
                const agent = agents.find((a) => a.id === item.agent_id)
                return (
                  <div key={item.id} className={styles.activityItem}>
                    {agent && (
                      <AgentAvatar agentId={agent.id} color={agent.color} size={24} />
                    )}
                    <div className={styles.activityContent}>
                      <span className={styles.activityMessage}>{item.message}</span>
                      <span className={styles.activityTime}>
                        {relativeTime(item.created_at)}
                      </span>
                    </div>
                    <span className={`${styles.typeBadge} ${styles[`type_${item.type}`]}`}>
                      {TYPE_LABELS[item.type]}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className={styles.agentStatusCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Agent Status</span>
            <span className={styles.badge}>{agents.length} agents</span>
          </div>
          <div className={styles.agentStatusList}>
            {tasksError && (
              <p className={styles.errorMsg}>Failed to load data — refresh to retry</p>
            )}
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={styles.agentStatusRow}
                onClick={() => onNavigateToChat(agent.id)}
              >
                <AgentAvatar agentId={agent.id} color={agent.color} size={28} />
                <div className={styles.agentStatusInfo}>
                  <span className={styles.agentStatusName}>{agent.name}</span>
                  <span className={styles.agentStatusRole}>{agent.role}</span>
                </div>
                <StatusBadge status={AGENT_BADGE_STATUS[agent.id] ?? 'idle'} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
