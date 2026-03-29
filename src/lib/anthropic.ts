import Anthropic from '@anthropic-ai/sdk'

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    '[anthropic] ERROR: ANTHROPIC_API_KEY is not set. ' +
    'Add it to .env.local: ANTHROPIC_API_KEY=your_key_here'
  )
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface MessageHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export async function sendMessage(
  systemPrompt: string,
  history: MessageHistoryItem[],
  userMessage: string
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: 'user' as const,
      content: userMessage,
    },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in response')
  }

  return textBlock.text
}

export default client
