'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Breadcrumbs.module.css'

interface Crumb {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  /** Override auto-generated crumbs for custom labeling */
  crumbs?: Crumb[]
}

const SEGMENT_LABELS: Record<string, string> = {
  orchestrate: 'Orchestrate',
  agents: 'Agents',
  projects: 'Projects',
}

export default function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  const pathname = usePathname()

  const resolved: Crumb[] = crumbs ?? buildCrumbs(pathname)

  if (resolved.length <= 1) return null

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      {resolved.map((crumb, i) => {
        const isLast = i === resolved.length - 1
        return (
          <span key={i} className={styles.item}>
            {i > 0 && <span className={styles.sep}>/</span>}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className={styles.link}>{crumb.label}</Link>
            ) : (
              <span className={isLast ? styles.current : styles.link}>{crumb.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }]

  let path = ''
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    path += `/${seg}`
    const label = SEGMENT_LABELS[seg] ?? titleCase(seg)
    const isLast = i === segments.length - 1
    crumbs.push({ label, href: isLast ? undefined : path })
  }

  return crumbs
}

function titleCase(s: string): string {
  return s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
