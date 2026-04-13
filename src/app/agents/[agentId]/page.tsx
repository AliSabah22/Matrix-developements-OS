'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { AGENT_CONFIGS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import ProjectSelector from '@/components/project-selector'
import styles from './page.module.css'

const COLORS: Record<string, string> = {
  amber: '#ffb340',
  blue: '#4da8ff',
  green: '#00e5b4',
  pink: '#e879f9',
  orange: '#fb923c',
  emerald: '#34d399',
  violet: '#a78bfa',
  red: '#ff5c6a',
  yellow: '#facc15',
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  gray: '#9ca3af',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

export default function AgentChatPage() {
  const params = useParams()
  const rawId = Array.isArray(params.agentId) ? params.agentId[0] : (params.agentId as string)
  const agentId = rawId as AgentId

  // All hooks before any conditional render
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([
    'wraptors-saas',
    'archstudio',
    'multi-tenant-platform',
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset conversation when agent changes
  useEffect(() => {
    setMessages([])
    setInput('')
  }, [agentId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const config = AGENT_CONFIGS[agentId]

  if (!config) {
    return <div className={styles.notFound}>Agent &quot;{agentId}&quot; not found.</div>
  }

  const color = COLORS[config.color] ?? '#9ca3af'

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          selectedProjects,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = (await res.json()) as { response: string }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          isError: true,
        },
      ])
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
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.agentHeader}>
        <div className={styles.agentHeaderLeft}>
          <div className={styles.agentAvatar} style={{ backgroundColor: `${color}22`, color }}>
            {config.avatar}
          </div>
          <div className={styles.agentHeaderInfo}>
            <div className={styles.agentNameRow}>
              <h1 className={styles.agentName}>{config.name}</h1>
              <span className={styles.agentDept}>{config.department}</span>
            </div>
            <span className={styles.agentTitle}>{config.title}</span>
          </div>
        </div>
        <ProjectSelector value={selectedProjects} onChange={setSelectedProjects} />
      </div>

      {/* Empty state */}
      {messages.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyAvatar} style={{ backgroundColor: `${color}18`, color }}>
            {config.avatar}
          </div>
          <h2 className={styles.emptyName}>{config.name}</h2>
          <p className={styles.emptyDesc}>{config.description}</p>
        </div>
      )}

      {/* Message list */}
      {(messages.length > 0 || loading) && (
        <div className={styles.messageList}>
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={i}
                className={`${styles.messageRow} ${isUser ? styles.rowUser : styles.rowAgent}`}
              >
                {!isUser && (
                  <div
                    className={styles.msgAvatar}
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {config.avatar}
                  </div>
                )}
                <div className={styles.messageGroup}>
                  <span className={styles.senderLabel}>{isUser ? 'You' : config.name}</span>
                  <div
                    className={`${styles.bubble} ${
                      isUser
                        ? styles.bubbleUser
                        : msg.isError
                        ? styles.bubbleError
                        : styles.bubbleAgent
                    }`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                </div>
                {isUser && <div className={styles.userAvatar}>Y</div>}
              </div>
            )
          })}

          {loading && (
            <div className={`${styles.messageRow} ${styles.rowAgent}`}>
              <div
                className={styles.msgAvatar}
                style={{ backgroundColor: `${color}22`, color }}
              >
                {config.avatar}
              </div>
              <div className={styles.messageGroup}>
                <span className={styles.senderLabel}>{config.name}</span>
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
      )}

      {/* Spacer ref when empty state is showing */}
      {messages.length === 0 && !loading && <div ref={messagesEndRef} />}

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputContainer}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            placeholder={`Message ${config.name}...`}
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
              <path
                d="M7 12V2M2 7L7 2L12 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <span className={styles.inputHint}>Enter to send · Shift+Enter for new line</span>
      </div>
    </div>
  )
}
