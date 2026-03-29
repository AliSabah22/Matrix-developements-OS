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
      <div className={styles.logo}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="7" height="7" rx="2" fill="var(--accent2)" />
          <rect x="10" y="1" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.6" />
          <rect x="1" y="10" width="7" height="7" rx="2" fill="var(--accent)" opacity="0.4" />
          <rect x="10" y="10" width="7" height="7" rx="2" fill="var(--accent2)" opacity="0.8" />
        </svg>
        <span className={styles.logoText}>Company OS</span>
      </div>

      <div className={styles.right}>
        {agentCount > 0 && (
          <div className={styles.agentStatus}>
            <span className={styles.pulseDot} />
            <span className={styles.agentLabel}>
              {agentCount} agents active
            </span>
          </div>
        )}
        <span className={styles.clock}>{time}</span>
      </div>
    </header>
  )
}
