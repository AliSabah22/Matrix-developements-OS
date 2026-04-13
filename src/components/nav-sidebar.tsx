'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AGENT_CONFIGS, ALL_AGENT_IDS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import styles from './nav-sidebar.module.css'

const COLORS: Record<string, string> = {
  amber: '#ffb340',
  blue: '#4da8ff',
  green: '#00e5b4',
  pink: '#e879f9',
  orange: '#fb923c',
  emerald: '#34d399',
  violet: '#a78bfa',
  red: '#ff5c6a',
  yellow: '#facc15',
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  gray: '#9ca3af',
}

const DEPT_ORDER = [
  'Leadership',
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Finance',
  'Customer Success',
  'Operations',
]

export default function NavSidebar() {
  const pathname = usePathname()

  const agentsByDept = DEPT_ORDER.reduce<Record<string, AgentId[]>>((acc, dept) => {
    acc[dept] = ALL_AGENT_IDS.filter((id) => AGENT_CONFIGS[id].department === dept)
    return acc
  }, {})

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect
            x="2" y="6" width="16" height="16" rx="4"
            fill="var(--accent)" opacity="0.9"
            transform="rotate(-15 10 14)"
          />
          <rect
            x="14" y="10" width="16" height="16" rx="4"
            fill="var(--accent2)" opacity="0.7"
            transform="rotate(-15 22 18)"
          />
        </svg>
        <span className={styles.logoText}>Matrix OS</span>
      </div>

      <nav className={styles.nav}>
        <Link
          href="/"
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon}>⊕</span>
          Command Center
        </Link>
        <Link
          href="/ops"
          className={`${styles.navItem} ${pathname === '/ops' ? styles.navItemActive : ''}`}
        >
          <span className={styles.navIcon}>◎</span>
          Operations Panel
        </Link>
      </nav>

      <div className={styles.divider} />

      <div className={styles.agentsList}>
        {DEPT_ORDER.map((dept) => {
          const ids = agentsByDept[dept]
          if (!ids?.length) return null
          return (
            <div key={dept} className={styles.deptGroup}>
              <span className={styles.deptLabel}>{dept}</span>
              {ids.map((id) => {
                const agent = AGENT_CONFIGS[id]
                const color = COLORS[agent.color] ?? '#9ca3af'
                const isActive = pathname === `/agents/${id}`
                return (
                  <Link
                    key={id}
                    href={`/agents/${id}`}
                    className={`${styles.agentRow} ${isActive ? styles.agentRowActive : ''}`}
                  >
                    <div
                      className={styles.agentAvatar}
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {agent.avatar}
                    </div>
                    <div className={styles.agentInfo}>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentTitle}>
                        {agent.title.split(' / ')[0]}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
