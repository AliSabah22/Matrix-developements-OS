'use client'

import styles from './AgentAvatar.module.css'
import type { AgentId } from '@/types'

interface AgentAvatarProps {
  agentId: AgentId
  color: string
  size?: number
}

const INITIALS: Record<AgentId, string> = {
  ceo: 'C',
  coo: 'O',
  cto: 'T',
  cmo: 'M',
  cpo: 'P',
  cfo: 'F',
  engineer: 'E',
}

export default function AgentAvatar({ agentId, color, size = 28 }: AgentAvatarProps) {
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}26`,
        color,
        fontSize: Math.round(size * 0.43),
      }}
    >
      {INITIALS[agentId]}
    </div>
  )
}
