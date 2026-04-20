'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AGENT_CONFIGS, ALL_AGENT_IDS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import styles from './GlobalNav.module.css'

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

const PROJECTS = [
  { id: 'wraptors-saas', name: 'Wraptors SaaS', icon: '🚗' },
  { id: 'archstudio', name: 'ArchStudio', icon: '🏛️' },
  { id: 'multi-tenant-platform', name: 'Platform', icon: '⚙️' },
]

export default function GlobalNav() {
  const pathname = usePathname()

  const agentsByDept = DEPT_ORDER.reduce<Record<string, AgentId[]>>((acc, dept) => {
    acc[dept] = ALL_AGENT_IDS.filter((id) => AGENT_CONFIGS[id].department === dept)
    return acc
  }, {})

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="2" y="6" width="16" height="16" rx="4" fill="var(--accent)" opacity="0.9" transform="rotate(-15 10 14)" />
          <rect x="14" y="10" width="16" height="16" rx="4" fill="var(--accent2)" opacity="0.7" transform="rotate(-15 22 18)" />
        </svg>
        <span className={styles.logoText}>Matrix OS</span>
      </div>

      <div className={styles.scrollArea}>
        <nav className={styles.nav}>
          <Link
            href="/"
            className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}
          >
            <span className={styles.icon}>⊕</span>
            Command Center
          </Link>
          <Link
            href="/orchestrate"
            className={`${styles.navItem} ${pathname.startsWith('/orchestrate') ? styles.active : ''}`}
          >
            <span className={styles.icon}>◈</span>
            Orchestrate
          </Link>
        </nav>

        <div className={styles.divider} />

        {/* Projects */}
        <div className={styles.sectionLabel}>Projects</div>
        <nav className={styles.nav}>
          {PROJECTS.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={`${styles.navItem} ${pathname === `/projects/${p.id}` ? styles.active : ''}`}
            >
              <span className={styles.icon}>{p.icon}</span>
              {p.name}
            </Link>
          ))}
        </nav>

        <div className={styles.divider} />

        {/* Agents */}
        <div className={styles.sectionLabel}>Agents</div>
        {DEPT_ORDER.map((dept) => {
          const ids = agentsByDept[dept]
          if (!ids?.length) return null
          return (
            <div key={dept} className={styles.deptGroup}>
              <div className={styles.deptLabel}>{dept}</div>
              {ids.map((id) => {
                const agent = AGENT_CONFIGS[id]
                const color = COLORS[agent.color] ?? '#9ca3af'
                const isActive = pathname === `/agents/${id}`
                return (
                  <Link
                    key={id}
                    href={`/agents/${id}`}
                    className={`${styles.agentRow} ${isActive ? styles.agentActive : ''}`}
                  >
                    <div
                      className={styles.agentAvatar}
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {agent.avatar}
                    </div>
                    <div className={styles.agentInfo}>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentRole}>
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
