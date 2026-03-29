import * as ceo from '@/agents/ceo'
import * as coo from '@/agents/coo'
import * as cto from '@/agents/cto'
import * as cmo from '@/agents/cmo'
import * as cpo from '@/agents/cpo'
import * as cfo from '@/agents/cfo'
import * as engineer from '@/agents/engineer'

export interface AgentDefinition {
  id: string
  name: string
  color: string
  role: string
  systemPrompt: string
}

export interface AgentPublic {
  id: string
  name: string
  color: string
  role: string
}

export const AGENTS: AgentDefinition[] = [
  ceo,
  coo,
  cto,
  cmo,
  cpo,
  cfo,
  engineer,
]

export function getAgent(id: string): AgentDefinition {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) {
    throw new Error(`Agent not found: ${id}`)
  }
  return agent
}

export function getSystemPrompt(id: string): string {
  return getAgent(id).systemPrompt
}
