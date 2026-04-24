'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { AGENT_CONFIGS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import ProjectSelector from '@/components/project-selector'
import Breadcrumbs from '@/components/Breadcrumbs'
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
  streaming?: boolean
}

export default function AgentChatPage() {
  const params = useParams()
  const rawId = Array.isArray(params.agentId) ? params.agentId[0] : (params.agentId as string)
  const agentId = rawId as AgentId

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
  const abortRef = useRef<AbortController | null>(null)

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
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    // Add empty streaming assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          selectedProjects,
        }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string
              text?: string
              message?: string
            }
            if (data.type === 'text' && data.text) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + data.text }
                }
                return updated
              })
            } else if (data.type === 'error') {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: data.message ?? 'Something went wrong.',
                  isError: true,
                }
                return updated
              })
            }
          } catch {
            // malformed SSE line, skip
          }
        }
      }

      // Mark streaming complete
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && last.streaming) {
          updated[updated.length - 1] = { ...last, streaming: false }
        }
        return updated
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          isError: true,
        }
        return updated
      })
    } finally {
      setLoading(false)
      abortRef.current = null
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
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Agents', href: '/agents' }, { label: config.name }]} />
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
      {messages.length > 0 && (
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
                      <>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.streaming && <span className={styles.cursor} />}
                      </>
                    )}
                  </div>
                </div>
                {isUser && <div className={styles.userAvatar}>Y</div>}
              </div>
            )
          })}

          <div ref={messagesEndRef} />
        </div>
      )}

      {messages.length === 0 && <div ref={messagesEndRef} />}

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
