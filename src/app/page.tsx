import Link from 'next/link'
import { AGENT_CONFIGS, ALL_AGENT_IDS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import ActivityFeed from '@/components/ActivityFeed'
import styles from './page.module.css'

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

const PROJECTS = [
  {
    id: 'wraptors-saas',
    name: 'Wraptors SaaS',
    type: 'Vertical SaaS',
    status: 'Active — Building',
    statusKey: 'green',
    description:
      'OS for high-end automotive wrap, PPF, tint, and detailing shops. Replaces GoHighLevel + TintWiz + spreadsheets.',
    agents: ['ceo-strategy', 'developer', 'designer', 'marketing', 'product-manager'] as AgentId[],
  },
  {
    id: 'archstudio',
    name: 'ArchStudio',
    type: 'Custom Software',
    status: 'Active — Building',
    statusKey: 'blue',
    description: 'Custom project management and client portal for an architecture firm.',
    agents: ['developer', 'designer', 'product-manager'] as AgentId[],
  },
  {
    id: 'multi-tenant-platform',
    name: 'Multi-Tenant Platform',
    type: 'Internal Platform',
    status: 'Active — Planning',
    statusKey: 'amber',
    description: 'Shared infrastructure to scale the vertical SaaS model to new industries.',
    agents: ['cto-architect', 'developer', 'devops', 'product-manager'] as AgentId[],
  },
]

const DEPT_ORDER = [
  'Leadership', 'Engineering', 'Design', 'Product',
  'Marketing', 'Sales', 'Finance', 'Customer Success', 'Operations',
]

export default function CommandCenter() {
  const agentsByDept = DEPT_ORDER.reduce<Record<string, AgentId[]>>((acc, dept) => {
    acc[dept] = ALL_AGENT_IDS.filter((id) => AGENT_CONFIGS[id].department === dept)
    return acc
  }, {})

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.pageTitle}>Command Center</span>
          <span className={styles.statusPip} />
          <span className={styles.statusText}>3 projects · 12 agents · vault connected</span>
        </div>
        <div className={styles.topbarRight}>
          <Link href="/orchestrate" className={styles.orchBtn}>◈ Orchestrate</Link>
        </div>
      </header>

      <div className={styles.body}>
        {/* Main content */}
        <div className={styles.mainCol}>
          {/* Projects */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Active Projects</span>
              <span className={styles.sectionCount}>3</span>
            </div>
            <div className={styles.projectGrid}>
              {PROJECTS.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`${styles.projectCard} ${styles[`card_${project.statusKey}`]}`}
                >
                  <div className={styles.projectCardTop}>
                    <span className={`${styles.statusBadge} ${styles[`badge_${project.statusKey}`]}`}>
                      {project.status}
                    </span>
                    <span className={styles.projectType}>{project.type}</span>
                  </div>
                  <h2 className={styles.projectName}>{project.name}</h2>
                  <p className={styles.projectDesc}>{project.description}</p>
                  <div className={styles.projectAgents}>
                    {project.agents.map((id) => {
                      const agent = AGENT_CONFIGS[id]
                      if (!agent) return null
                      const color = COLORS[agent.color] ?? '#9ca3af'
                      return (
                        <span
                          key={id}
                          className={styles.agentChip}
                          style={{ '--chip-color': color } as React.CSSProperties}
                          title={agent.name}
                        >
                          {agent.avatar}
                        </span>
                      )
                    })}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Agent roster */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Agent Roster</span>
              <span className={styles.sectionCount}>12</span>
            </div>
            {DEPT_ORDER.map((dept) => {
              const ids = agentsByDept[dept]
              if (!ids?.length) return null
              return (
                <div key={dept} className={styles.deptBlock}>
                  <span className={styles.deptLabel}>{dept}</span>
                  <div className={styles.agentGrid}>
                    {ids.map((id) => {
                      const agent = AGENT_CONFIGS[id]
                      const color = COLORS[agent.color] ?? '#9ca3af'
                      return (
                        <Link key={id} href={`/agents/${id}`} className={styles.agentCard}>
                          <div
                            className={styles.agentCardAvatar}
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {agent.avatar}
                          </div>
                          <div className={styles.agentCardInfo}>
                            <span className={styles.agentCardName}>{agent.name}</span>
                            <span className={styles.agentCardTitle}>{agent.title}</span>
                          </div>
                          <span className={styles.agentCardArrow}>→</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        </div>

        {/* Activity feed */}
        <aside className={styles.feedCol}>
          <ActivityFeed />
        </aside>
      </div>
    </div>
  )
}
