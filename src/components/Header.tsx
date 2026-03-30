'use client'

import { useState, useEffect } from 'react'
import styles from './Header.module.css'

interface HeaderProps {
  agentCount: number
}

function formatClock(date: Date): string {
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

export default function Header({ agentCount }: HeaderProps) {
  const [time, setTime] = useState('')

  useEffect(() => {
    setTime(formatClock(new Date()))
    const interval = setInterval(() => setTime(formatClock(new Date())), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoMark}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
        </div>
        <span className={styles.logoText}>Matrix Developements</span>
        <div className={styles.divider} />
      </div>

      <div className={styles.right}>
        {agentCount > 0 && (
          <div className={styles.statusGroup}>
            <span className={styles.pulseDot} />
            <span className={styles.statusLabel}>{agentCount} agents active</span>
          </div>
        )}
        <div className={styles.vDivider} />
        <span className={styles.clock}>{time}</span>
      </div>
    </header>
  )
}
