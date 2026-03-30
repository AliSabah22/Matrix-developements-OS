import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask, createActivity } from '@/lib/db'
import { getAgent, VALID_AGENT_IDS } from '@/lib/agents'

const VALID_STATUSES = new Set(['active', 'done', 'blocked', 'review'])
const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    if (status !== null && !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, done, blocked, review' },
        { status: 400 }
      )
    }

    const tasks = getTasks(status ?? undefined)
    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const { title, agentId, priority, context } = body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'title is required and must be a non-empty string' }, { status: 400 })
  }

  if (!agentId || typeof agentId !== 'string' || !VALID_AGENT_IDS.has(agentId)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  if (!priority || typeof priority !== 'string' || !VALID_PRIORITIES.has(priority)) {
    return NextResponse.json(
      { error: 'priority is required and must be one of: high, medium, low' },
      { status: 400 }
    )
  }

  try {
    const agent = getAgent(agentId)
    const task = createTask({
      title: title.trim(),
      agent_id: agentId,
      priority: priority as 'high' | 'medium' | 'low',
      context: typeof context === 'string' ? context.trim() || undefined : undefined,
    })

    createActivity(agentId, `${agent.name} was assigned: ${task.title}`, 'updated')

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
