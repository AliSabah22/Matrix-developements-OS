import { NextRequest, NextResponse } from 'next/server'
import { getAgent, VALID_AGENT_IDS } from '@/lib/agents'
import { sendMessage } from '@/lib/anthropic'
import { getConversation, saveMessage, createActivity, ConversationRow } from '@/lib/db'

const MAX_MESSAGE_LENGTH = 4000

interface ChatRequestBody {
  agentId: string
  message: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ChatRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const { agentId, message } = body

  if (!agentId || typeof agentId !== 'string' || !VALID_AGENT_IDS.has(agentId)) {
    return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 })
  }

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const trimmed = message.trim()

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
      { status: 400 }
    )
  }

  const agent = getAgent(agentId)

  try {
    const history = getConversation(agentId)
    const historyForApi = history.map((row: ConversationRow) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    const response = await sendMessage(agent.systemPrompt, historyForApi, trimmed)

    saveMessage(agentId, 'user', trimmed)
    saveMessage(agentId, 'assistant', response)

    createActivity(
      agentId,
      `Responded to: "${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}"`,
      'updated'
    )

    return NextResponse.json({ response, agentId })
  } catch (error) {
    console.error('[agents/chat]', error)
    return NextResponse.json(
      { error: 'Agent unavailable — try again' },
      { status: 502 }
    )
  }
}
