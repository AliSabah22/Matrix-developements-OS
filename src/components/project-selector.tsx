'use client'

import styles from './project-selector.module.css'

const PROJECTS = [
  { label: 'All Projects', value: ['wraptors-saas', 'archstudio', 'multi-tenant-platform'] },
  { label: 'Wraptors SaaS', value: ['wraptors-saas'] },
  { label: 'ArchStudio', value: ['archstudio'] },
  { label: 'Multi-Tenant Platform', value: ['multi-tenant-platform'] },
] as const

interface ProjectSelectorProps {
  value: string[]
  onChange: (projects: string[]) => void
}

export default function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  const currentLabel = PROJECTS.find(
    (p) => JSON.stringify([...p.value].sort()) === JSON.stringify([...value].sort())
  )?.label ?? 'All Projects'

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Focus:</span>
      <div className={styles.pills}>
        {PROJECTS.map((p) => (
          <button
            key={p.label}
            className={`${styles.pill} ${currentLabel === p.label ? styles.pillActive : ''}`}
            onClick={() => onChange([...p.value])}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
