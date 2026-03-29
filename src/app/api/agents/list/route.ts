import { NextResponse } from 'next/server'
import { AGENTS, AgentPublic } from '@/lib/agents'

export async function GET(): Promise<NextResponse> {
  const agents: AgentPublic[] = AGENTS.map(({ id, name, color, role }) => ({
    id,
    name,
    color,
    role,
  }))

  return NextResponse.json(agents)
}
