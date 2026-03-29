import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/db'
import { createActivity } from '@/lib/db'
import { getAgent } from '@/lib/agents'

const VALID_STATUSES = new Set(['active', 'done', 'blocked', 'review'])
const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')

  if (status !== null && !VALID_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: active, done, blocked, review` },
      { status: 400 }
    )
  }

  const tasks = getTasks(status ?? undefined)
  return NextResponse.json({ tasks })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { title, agentId, priority, context } = body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json(
      { error: 'title is required and must be a non-empty string' },
      { status: 400 }
    )
  }

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json(
      { error: 'agentId is required and must be a string' },
      { status: 400 }
    )
  }

  if (!priority || typeof priority !== 'string' || !VALID_PRIORITIES.has(priority)) {
    return NextResponse.json(
      { error: 'priority is required and must be one of: high, medium, low' },
      { status: 400 }
    )
  }

  let agent
  try {
    agent = getAgent(agentId)
  } catch {
    return NextResponse.json(
      { error: `Unknown agent: ${agentId}` },
      { status: 400 }
    )
  }

  try {
    const task = createTask({
      title: title.trim(),
      agent_id: agentId,
      priority: priority as 'high' | 'medium' | 'low',
      context: typeof context === 'string' ? context : undefined,
    })

    createActivity(
      agentId,
      `${agent.name} was assigned: ${task.title}`,
      'updated'
    )

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
