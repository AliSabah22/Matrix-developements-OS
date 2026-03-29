import { NextRequest, NextResponse } from 'next/server'
import { getAgent } from '@/lib/agents'
import { sendMessage } from '@/lib/anthropic'
import {
  getConversation,
  saveMessage,
  createActivity,
  ConversationRow,
} from '@/lib/db'

interface ChatRequestBody {
  agentId: string
  message: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ChatRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { agentId, message } = body

  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json(
      { error: 'agentId is required and must be a string' },
      { status: 400 }
    )
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json(
      { error: 'message is required and must be a non-empty string' },
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
    const history = getConversation(agentId)
    const historyForApi = history.map((row: ConversationRow) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    const response = await sendMessage(
      agent.systemPrompt,
      historyForApi,
      message.trim()
    )

    saveMessage(agentId, 'user', message.trim())
    saveMessage(agentId, 'assistant', response)

    createActivity(
      agentId,
      `Responded to: "${message.trim().slice(0, 80)}${message.trim().length > 80 ? '...' : ''}"`,
      'updated'
    )

    return NextResponse.json({ response, agentId })
  } catch (error) {
    console.error(`[chat] Error from agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to get response from AI. Check server logs for details.' },
      { status: 500 }
    )
  }
}
