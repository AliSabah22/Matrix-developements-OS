'use client'

import { useState, useEffect } from 'react'
import styles from './Sidebar.module.css'
import type { Agent, AgentId, PanelId } from '@/types'

interface SidebarProps {
  agents: Agent[]
  activePanel: PanelId
  activeAgent: AgentId
  onPanelChange: (panel: PanelId) => void
  onAgentSelect: (agentId: AgentId) => void
}

const NAV_ITEMS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'hq', label: 'HQ Overview', icon: '⬡' },
  { id: 'chat', label: 'Chat Room', icon: '◎' },
  { id: 'tasks', label: 'Tasks', icon: '▤' },
  { id: 'review', label: 'Review Board', icon: '◈' },
]

const AGENT_STATUSES: Record<AgentId, { text: string; state: 'active' | 'busy' | 'idle' }> = {
  ceo: { text: 'Strategy mode', state: 'active' },
  coo: { text: 'Planning sprint', state: 'active' },
  cto: { text: 'Architecting', state: 'active' },
  cmo: { text: 'Building GTM', state: 'idle' },
  cpo: { text: 'Writing specs', state: 'active' },
  cfo: { text: 'Modeling costs', state: 'busy' },
  engineer: { text: 'Building', state: 'active' },
}

const INITIALS: Record<AgentId, string> = {
  ceo: 'C', coo: 'O', cto: 'T', cmo: 'M', cpo: 'P', cfo: 'F', engineer: 'E',
}

export default function Sidebar({
  agents,
  activePanel,
  activeAgent,
  onPanelChange,
  onAgentSelect,
}: SidebarProps) {
  const [reviewCount, setReviewCount] = useState(0)

  useEffect(() => {
    const load = () => {
      fetch('/api/tasks?status=review')
        .then((r) => r.json())
        .then((data: { tasks: { id: number }[] }) => setReviewCount(data.tasks?.length ?? 0))
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <span className={styles.sectionLabel}>Navigate</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activePanel === item.id ? styles.navItemActive : ''}`}
            onClick={() => onPanelChange(item.id)}
          >
            <span className={`${styles.navIcon} ${activePanel === item.id ? styles.navIconActive : ''}`}>
              {item.icon}
            </span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.id === 'tasks' && reviewCount > 0 && (
              <span className={`${styles.notifDot} ${styles.dotRed}`} />
            )}
            {item.id === 'review' && reviewCount > 0 && (
              <span className={`${styles.notifDot} ${styles.dotAmber}`} />
            )}
          </button>
        ))}
      </nav>

      <div className={styles.agentsSection}>
        <div className={styles.agentsDivider} />
        <span className={styles.sectionLabel}>Agents</span>
        {agents.map((agent) => {
          const status = AGENT_STATUSES[agent.id]
          const isActive = activeAgent === agent.id && activePanel === 'chat'
          return (
            <button
              key={agent.id}
              className={`${styles.agentRow} ${isActive ? styles.agentRowActive : ''}`}
              onClick={() => onAgentSelect(agent.id)}
            >
              <div
                className={styles.agentAvatar}
                style={{
                  backgroundColor: `${agent.color}26`,
                  color: agent.color,
                }}
              >
                {INITIALS[agent.id]}
              </div>
              <div className={styles.agentInfo}>
                <span className={styles.agentName}>{agent.name}</span>
                <span className={styles.agentStatusText}>{status?.text ?? 'online'}</span>
              </div>
              <span
                className={styles.statusDot}
                style={{
                  background:
                    status?.state === 'active' ? 'var(--green)'
                    : status?.state === 'busy' ? 'var(--amber)'
                    : 'var(--text4)',
                  boxShadow:
                    status?.state === 'active' ? '0 0 8px var(--green-dim)'
                    : status?.state === 'busy' ? '0 0 8px var(--amber-dim)'
                    : 'none',
                }}
              />
            </button>
          )
        })}
      </div>
    </aside>
  )
}
