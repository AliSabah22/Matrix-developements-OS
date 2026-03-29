import { NextRequest, NextResponse } from 'next/server'
import { getTasks, updateTask } from '@/lib/db'
import { createActivity } from '@/lib/db'
import { getAgent } from '@/lib/agents'

const VALID_STATUSES = new Set(['active', 'done', 'blocked', 'review'])
const VALID_PRIORITIES = new Set(['high', 'medium', 'low'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Task id must be a number' },
      { status: 400 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { status, output, title, priority } = body

  if (status !== undefined && (typeof status !== 'string' || !VALID_STATUSES.has(status))) {
    return NextResponse.json(
      { error: 'status must be one of: active, done, blocked, review' },
      { status: 400 }
    )
  }

  if (priority !== undefined && (typeof priority !== 'string' || !VALID_PRIORITIES.has(priority))) {
    return NextResponse.json(
      { error: 'priority must be one of: high, medium, low' },
      { status: 400 }
    )
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return NextResponse.json(
      { error: 'title must be a non-empty string' },
      { status: 400 }
    )
  }

  // Load the existing task to get agent info and previous status
  const existing = getTasks().find((t) => t.id === id)
  if (!existing) {
    return NextResponse.json(
      { error: `Task ${id} not found` },
      { status: 404 }
    )
  }

  try {
    const updated = updateTask(id, {
      ...(status !== undefined && { status: status as 'active' | 'done' | 'blocked' | 'review' }),
      ...(output !== undefined && typeof output === 'string' && { output }),
      ...(title !== undefined && typeof title === 'string' && { title: title.trim() }),
      ...(priority !== undefined && { priority: priority as 'high' | 'medium' | 'low' }),
    })

    if (!updated) {
      return NextResponse.json(
        { error: `Task ${id} not found` },
        { status: 404 }
      )
    }

    // Create activity entry when status changes to a terminal/notable state
    if (status !== undefined && status !== existing.status) {
      let agent
      try {
        agent = getAgent(updated.agent_id)
      } catch {
        agent = { name: updated.agent_id }
      }

      const taskTitle = updated.title

      if (status === 'done') {
        createActivity(updated.agent_id, `${agent.name} completed: ${taskTitle}`, 'done')
      } else if (status === 'blocked') {
        createActivity(updated.agent_id, `${agent.name} is blocked on: ${taskTitle}`, 'alert')
      } else if (status === 'review') {
        createActivity(updated.agent_id, `${agent.name} submitted for review: ${taskTitle}`, 'updated')
      }
    }

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error(`[PATCH /api/tasks/${id}] Error:`, error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
