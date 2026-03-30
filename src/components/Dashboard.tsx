'use client'

import { useState, useEffect } from 'react'
import styles from './Dashboard.module.css'
import Sidebar from './Sidebar'
import Header from './Header'
import HQPanel from './panels/HQPanel'
import ChatPanel from './panels/ChatPanel'
import TasksPanel from './panels/TasksPanel'
import ReviewPanel from './panels/ReviewPanel'
import type { Agent, AgentId, PanelId } from '@/types'

export default function Dashboard() {
  const [activePanel, setActivePanel] = useState<PanelId>('hq')
  const [activeAgent, setActiveAgent] = useState<AgentId>('ceo')
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsError, setAgentsError] = useState(false)
  const [chatPreFill, setChatPreFill] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents/list')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: Agent[]) => setAgents(data))
      .catch((err) => {
        console.error('[Dashboard] failed to load agents:', err)
        setAgentsError(true)
      })
  }, [])

  const handleRevise = (agentId: AgentId, message: string) => {
    setActiveAgent(agentId)
    setChatPreFill(message)
    setActivePanel('chat')
  }

  const handleNavigateToChat = (agentId: AgentId) => {
    setActiveAgent(agentId)
    setActivePanel('chat')
  }

  if (agentsError) {
    return (
      <div className={styles.errorFull}>
        Failed to load agents — refresh to retry
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Sidebar
        agents={agents}
        activePanel={activePanel}
        activeAgent={activeAgent}
        onPanelChange={setActivePanel}
        onAgentSelect={handleNavigateToChat}
      />
      <div className={styles.main}>
        <Header agentCount={agents.length} />
        <div className={styles.panelArea}>
          {activePanel === 'hq' && (
            <HQPanel agents={agents} onNavigateToChat={handleNavigateToChat} />
          )}
          {activePanel === 'chat' && (
            <ChatPanel
              agents={agents}
              activeAgent={activeAgent}
              onAgentSelect={setActiveAgent}
              preFill={chatPreFill}
              onPreFillConsumed={() => setChatPreFill(null)}
            />
          )}
          {activePanel === 'tasks' && (
            <TasksPanel agents={agents} />
          )}
          {activePanel === 'review' && (
            <ReviewPanel agents={agents} onRevise={handleRevise} />
          )}
        </div>
      </div>
    </div>
  )
}
