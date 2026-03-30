export type AgentId = 'ceo' | 'coo' | 'cto' | 'cmo' | 'cpo' | 'cfo' | 'engineer'

export type PanelId = 'hq' | 'chat' | 'tasks' | 'review'

export type BadgeStatus = 'working' | 'idle' | 'reviewing' | 'blocked'

export interface Agent {
  id: AgentId
  name: string
  color: string
  role: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  agentId: AgentId
  timestamp: string
  isError?: boolean
}

export interface Task {
  id: number
  title: string
  agent_id: AgentId
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'done' | 'blocked' | 'review'
  context?: string
  output?: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  agent_id: AgentId
  message: string
  type: 'done' | 'alert' | 'updated' | 'report'
  created_at: string
}
