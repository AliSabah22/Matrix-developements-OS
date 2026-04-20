'use client'

import { useAgentActivity } from '@/hooks/useAgentActivity'
import { AGENT_CONFIGS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import styles from './ActivityFeed.module.css'

export default function ActivityFeed() {
  const activities = useAgentActivity(30)

  return (
    <div className={styles.feed}>
      <div className={styles.feedHeader}>
        <span className={styles.feedTitle}>Live Activity</span>
        <span className={styles.liveDot} />
      </div>
      <div className={styles.feedList}>
        {activities.length === 0 ? (
          <div className={styles.empty}>No activity yet. Start a conversation with an agent.</div>
        ) : (
          activities.map((item) => {
            const agent = item.agentId ? AGENT_CONFIGS[item.agentId as AgentId] : null
            return (
              <div key={item.id} className={styles.item}>
                {agent && (
                  <span className={styles.itemAvatar}>{agent.avatar}</span>
                )}
                <div className={styles.itemBody}>
                  {agent && (
                    <span className={styles.itemAgent}>{agent.name}</span>
                  )}
                  <span className={styles.itemText}>{item.text}</span>
                </div>
                <span className={styles.itemTime}>
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
