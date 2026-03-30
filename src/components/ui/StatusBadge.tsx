'use client'

import styles from './StatusBadge.module.css'
import type { BadgeStatus } from '@/types'

interface StatusBadgeProps {
  status: BadgeStatus
}

const LABELS: Record<BadgeStatus, string> = {
  working: 'working',
  idle: 'idle',
  reviewing: 'reviewing',
  blocked: 'blocked',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[status]}`}>
      {LABELS[status]}
    </span>
  )
}
