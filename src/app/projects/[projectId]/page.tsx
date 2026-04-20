import Link from 'next/link'
import { AGENT_CONFIGS, PROJECT_REPOS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from './page.module.css'

const PROJECT_META: Record<string, {
  name: string
  type: string
  status: string
  statusKey: string
  description: string
  wikiPage: string
  agents: AgentId[]
  tech: string[]
}> = {
  'wraptors-saas': {
    name: 'Wraptors SaaS',
    type: 'Vertical SaaS',
    status: 'Active — Building',
    statusKey: 'green',
    description: 'OS for high-end automotive wrap, PPF, tint, and detailing shops. Replaces GoHighLevel + TintWiz + spreadsheets with a unified platform.',
    wikiPage: 'projects/wraptors-saas',
    agents: ['ceo-strategy', 'developer', 'designer', 'marketing', 'product-manager', 'qa-testing'],
    tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind', 'Vercel'],
  },
  'archstudio': {
    name: 'ArchStudio',
    type: 'Custom Software',
    status: 'Active — Building',
    statusKey: 'blue',
    description: 'Custom project management and client portal for an architecture firm.',
    wikiPage: 'projects/archstudio',
    agents: ['developer', 'designer', 'product-manager', 'qa-testing'],
    tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Tailwind'],
  },
  'multi-tenant-platform': {
    name: 'Multi-Tenant Platform',
    type: 'Internal Platform',
    status: 'Active — Planning',
    statusKey: 'amber',
    description: 'Shared infrastructure to scale the vertical SaaS model to new industries beyond automotive.',
    wikiPage: 'projects/multi-tenant-platform',
    agents: ['cto-architect', 'developer', 'devops', 'product-manager'],
    tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Kubernetes', 'AWS'],
  },
}

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

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const meta = PROJECT_META[projectId]
  const repo = PROJECT_REPOS[projectId]

  if (!meta) {
    return (
      <div className={styles.notFound}>
        <h2>Project not found</h2>
        <Link href="/">← Back to Command Center</Link>
      </div>
    )
  }

  const statusColor = meta.statusKey === 'green' ? 'var(--green)'
    : meta.statusKey === 'blue' ? 'var(--blue)'
    : 'var(--amber)'

  return (
    <div className={styles.page}>
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Projects', href: '/projects' }, { label: meta.name }]} />
      {/* Header */}
      <div className={styles.projectHeader}>
        <div className={styles.projectHeaderTop}>
          <span
            className={styles.statusBadge}
            style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}
          >
            {meta.status}
          </span>
          <span className={styles.projectType}>{meta.type}</span>
        </div>
        <h1 className={styles.projectName}>{meta.name}</h1>
        <p className={styles.projectDesc}>{meta.description}</p>

        <div className={styles.headerMeta}>
          {repo && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>GitHub</span>
              <span className={styles.metaValue}>{repo.owner}/{repo.repo}</span>
            </div>
          )}
          {repo && (
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Branch</span>
              <span className={styles.metaValue}>{repo.defaultBranch}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Wiki</span>
            <span className={styles.metaValue}>wiki/{meta.wikiPage}.md</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left: Kanban + Tech */}
        <div className={styles.leftCol}>
          {/* Kanban */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Task Board</div>
            <div className={styles.kanban}>
              {(['queued', 'in_progress', 'blocked', 'done'] as const).map((col) => (
                <div key={col} className={styles.kanbanCol}>
                  <div className={styles.kanbanColHeader}>
                    {col === 'queued' ? 'Queued'
                      : col === 'in_progress' ? 'In Progress'
                      : col === 'blocked' ? 'Blocked'
                      : 'Done'}
                  </div>
                  <div className={styles.kanbanEmpty}>
                    No tasks
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>Tech Stack</div>
            <div className={styles.techList}>
              {meta.tech.map((t) => (
                <span key={t} className={styles.techTag}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Agents + Links */}
        <div className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Assigned Agents</div>
            <div className={styles.agentList}>
              {meta.agents.map((id) => {
                const agent = AGENT_CONFIGS[id]
                if (!agent) return null
                const color = COLORS[agent.color] ?? '#9ca3af'
                return (
                  <Link
                    key={id}
                    href={`/agents/${id}?project=${projectId}`}
                    className={styles.agentRow}
                  >
                    <div
                      className={styles.agentAvatar}
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {agent.avatar}
                    </div>
                    <div className={styles.agentInfo}>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentTitle}>{agent.department}</span>
                    </div>
                    <span className={styles.arrow}>→</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Quick Actions</div>
            <div className={styles.actionList}>
              <Link
                href={`/agents/product-manager?project=${projectId}`}
                className={styles.actionBtn}
              >
                📋 Open PRD with Compass
              </Link>
              <Link
                href={`/agents/cto-architect?project=${projectId}`}
                className={styles.actionBtn}
              >
                🔧 Architecture review with Forge
              </Link>
              <Link
                href={`/orchestrate?project=${projectId}`}
                className={styles.actionBtn}
              >
                ◈ Orchestrate a task
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
