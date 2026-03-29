'use client'

import { useState, useEffect } from 'react'
import styles from './Sidebar.module.css'
import AgentAvatar from './ui/AgentAvatar'
import type { Agent, AgentId, PanelId } from '@/types'

interface SidebarProps {
  agents: Agent[]
  activePanel: PanelId
  activeAgent: AgentId
  onPanelChange: (panel: PanelId) => void
  onAgentSelect: (agentId: AgentId) => void
}

const NAV_ITEMS: { id: PanelId; label: string; symbol: string }[] = [
  { id: 'hq', label: 'HQ Overview', symbol: '◈' },
  { id: 'chat', label: 'Chat Room', symbol: '⌘' },
  { id: 'tasks', label: 'Tasks', symbol: '▦' },
  { id: 'review', label: 'Review Board', symbol: '◉' },
]

const AGENT_STATUSES: Record<AgentId, { text: string; active: boolean }> = {
  ceo: { text: 'Strategy mode', active: true },
  coo: { text: 'Planning sprint', active: true },
  cto: { text: 'Architecting', active: true },
  cmo: { text: 'Building GTM', active: false },
  cpo: { text: 'Writing specs', active: true },
  cfo: { text: 'Modeling costs', active: false },
  engineer: { text: 'Building', active: true },
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
      <div className={styles.logoMark}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="1" width="8" height="8" rx="2" fill="var(--accent2)" />
          <rect x="11" y="1" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.6" />
          <rect x="1" y="11" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.4" />
          <rect x="11" y="11" width="8" height="8" rx="2" fill="var(--accent2)" opacity="0.8" />
        </svg>
      </div>

      <nav className={styles.nav}>
        <span className={styles.sectionLabel}>Navigate</span>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activePanel === item.id ? styles.navItemActive : ''}`}
            onClick={() => onPanelChange(item.id)}
          >
            <span className={styles.navSymbol}>{item.symbol}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.id === 'tasks' && reviewCount > 0 && (
              <span className={styles.dotRed} />
            )}
            {item.id === 'review' && reviewCount > 0 && (
              <span className={styles.dotAmber} />
            )}
          </button>
        ))}
      </nav>

      <div className={styles.agentsSection}>
        <span className={styles.sectionLabel}>Agents</span>
        {agents.map((agent) => {
          const status = AGENT_STATUSES[agent.id]
          return (
            <button
              key={agent.id}
              className={`${styles.agentRow} ${activeAgent === agent.id && activePanel === 'chat' ? styles.agentRowActive : ''}`}
              onClick={() => onAgentSelect(agent.id)}
            >
              <AgentAvatar agentId={agent.id} color={agent.color} size={28} />
              <div className={styles.agentInfo}>
                <span className={styles.agentName}>{agent.name}</span>
                <span className={styles.agentStatus}>{status?.text ?? 'online'}</span>
              </div>
              <span
                className={styles.statusDot}
                style={{ background: status?.active ? 'var(--green)' : 'var(--amber)' }}
              />
            </button>
          )
        })}
      </div>
    </aside>
  )
}
