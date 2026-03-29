'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ChatPanel.module.css'
import AgentAvatar from '@/components/ui/AgentAvatar'
import type { Agent, AgentId, Message } from '@/types'

interface ChatPanelProps {
  agents: Agent[]
  activeAgent: AgentId
  onAgentSelect: (agentId: AgentId) => void
  preFill: string | null
  onPreFillConsumed: () => void
}

type History = Record<string, Message[]>

export default function ChatPanel({
  agents,
  activeAgent,
  onAgentSelect,
  preFill,
  onPreFillConsumed,
}: ChatPanelProps) {
  const [history, setHistory] = useState<History>({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Apply preFill when it arrives
  useEffect(() => {
    if (preFill) {
      setInput(preFill)
      onPreFillConsumed()
      textareaRef.current?.focus()
    }
  }, [preFill, onPreFillConsumed])

  // Scroll to bottom when messages change or active agent changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, activeAgent, loading])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const currentMessages = history[activeAgent] ?? []
  const currentAgent = agents.find((a) => a.id === activeAgent)

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      role: 'user',
      content: text,
      agentId: activeAgent,
      timestamp: new Date().toISOString(),
    }

    setHistory((prev) => ({
      ...prev,
      [activeAgent]: [...(prev[activeAgent] ?? []), userMsg],
    }))
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: activeAgent, message: text }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = (await res.json()) as { response: string }

      const agentMsg: Message = {
        role: 'assistant',
        content: data.response,
        agentId: activeAgent,
        timestamp: new Date().toISOString(),
      }

      setHistory((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] ?? []), agentMsg],
      }))
    } catch (err) {
      console.error('[ChatPanel] send error:', err)
      const errMsg: Message = {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        agentId: activeAgent,
        timestamp: new Date().toISOString(),
      }
      setHistory((prev) => ({
        ...prev,
        [activeAgent]: [...(prev[activeAgent] ?? []), errMsg],
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.panel}>
      {/* Agent selector */}
      <div className={styles.agentSelector}>
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`${styles.agentPill} ${activeAgent === agent.id ? styles.agentPillActive : ''}`}
            onClick={() => onAgentSelect(agent.id)}
          >
            <span className={styles.agentDot} style={{ background: agent.color }} />
            {agent.name}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className={styles.messageList}>
        {currentMessages.length === 0 && !loading ? (
          <div className={styles.emptyState}>
            {currentAgent && (
              <>
                <AgentAvatar agentId={currentAgent.id} color={currentAgent.color} size={48} />
                <span className={styles.emptyName}>{currentAgent.name}</span>
                <span className={styles.emptyRole}>{currentAgent.role}</span>
                <span className={styles.emptyPrompt}>
                  Ask me anything about {currentAgent.role.toLowerCase()}
                </span>
              </>
            )}
          </div>
        ) : (
          currentMessages.map((msg, i) => {
            const isUser = msg.role === 'user'
            const agent = agents.find((a) => a.id === msg.agentId)
            return (
              <div key={i} className={`${styles.messageRow} ${isUser ? styles.rowUser : styles.rowAgent}`}>
                {!isUser && agent && (
                  <AgentAvatar agentId={agent.id} color={agent.color} size={28} />
                )}
                <div className={styles.messageGroup}>
                  <span className={styles.senderLabel}>
                    {isUser ? 'You' : agent?.name ?? msg.agentId}
                  </span>
                  <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAgent}`}>
                    {msg.content}
                  </div>
                </div>
                {isUser && (
                  <div className={styles.userAvatarPlaceholder}>Y</div>
                )}
              </div>
            )
          })
        )}

        {loading && (
          <div className={`${styles.messageRow} ${styles.rowAgent}`}>
            {currentAgent && (
              <AgentAvatar agentId={currentAgent.id} color={currentAgent.color} size={28} />
            )}
            <div className={styles.messageGroup}>
              <span className={styles.senderLabel}>{currentAgent?.name ?? activeAgent}</span>
              <div className={`${styles.bubble} ${styles.bubbleAgent}`}>
                <div className={styles.typing}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <span className={styles.inputLabel}>
          Chatting with: {currentAgent?.name ?? activeAgent}
        </span>
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className={`${styles.sendButton} ${loading || !input.trim() ? styles.sendDisabled : ''}`}
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V2M2 7L7 2L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
