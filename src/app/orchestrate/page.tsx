'use client'

import { useState, useRef } from 'react'
import { AGENT_CONFIGS } from '@/config/agents'
import type { AgentId } from '@/config/agents'
import ReactMarkdown from 'react-markdown'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from './page.module.css'

const PROJECTS = [
  { id: '', label: 'All Projects' },
  { id: 'wraptors-saas', label: 'Wraptors SaaS' },
  { id: 'archstudio', label: 'ArchStudio' },
  { id: 'multi-tenant-platform', label: 'Multi-Tenant Platform' },
]

interface LogEntry {
  id: number
  type: string
  agentId?: AgentId
  text?: string
  task?: string
  reasoning?: string
  agents?: AgentId[]
  output?: string
  isStreaming?: boolean
}

export default function OrchestratePage() {
  const [request, setRequest] = useState('')
  const [project, setProject] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [summary, setSummary] = useState('')
  const logEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  let logId = useRef(0)

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    logId.current += 1
    const newEntry = { ...entry, id: logId.current }
    setLog((prev) => [...prev, newEntry])
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    return logId.current
  }

  const updateLastLog = (id: number, updates: Partial<LogEntry>) => {
    setLog((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    )
  }

  const handleRun = async () => {
    const text = request.trim()
    if (!text || running) return

    setRunning(true)
    setLog([])
    setSummary('')

    const abort = new AbortController()
    abortRef.current = abort

    addLog({ type: 'init', text: `Starting orchestration: "${text}"` })

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: text, selectedProject: project || undefined }),
        signal: abort.signal,
      })

      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const agentLogIds: Record<string, number> = {}
      let summaryId: number | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'plan':
                addLog({
                  type: 'plan',
                  reasoning: data.reasoning,
                  agents: data.agents,
                })
                break

              case 'agent_start': {
                const id = addLog({
                  type: 'agent_start',
                  agentId: data.agentId,
                  task: data.task,
                  text: '',
                  isStreaming: true,
                })
                agentLogIds[data.agentId] = id
                break
              }

              case 'agent_token': {
                const existingId = agentLogIds[data.agentId]
                if (existingId) {
                  setLog((prev) =>
                    prev.map((e) =>
                      e.id === existingId
                        ? { ...e, text: (e.text ?? '') + data.text }
                        : e
                    )
                  )
                }
                break
              }

              case 'agent_done': {
                const doneId = agentLogIds[data.agentId]
                if (doneId) updateLastLog(doneId, { isStreaming: false })
                break
              }

              case 'summary': {
                if (!summaryId) {
                  summaryId = addLog({ type: 'summary', text: data.content, isStreaming: true })
                } else {
                  setLog((prev) =>
                    prev.map((e) =>
                      e.id === summaryId
                        ? { ...e, text: (e.text ?? '') + data.content }
                        : e
                    )
                  )
                  setSummary((prev) => prev + data.content)
                }
                break
              }

              case 'complete':
                if (summaryId) updateLastLog(summaryId, { isStreaming: false })
                break

              case 'error':
                addLog({ type: 'error', text: data.message })
                break
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        addLog({ type: 'error', text: err instanceof Error ? err.message : String(err) })
      }
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setRunning(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Breadcrumbs />
        <h1 className={styles.title}>Orchestrate</h1>
        <p className={styles.subtitle}>
          Describe what you want to build. The orchestrator will decompose it and route to the right agents.
        </p>
      </div>

      {/* Input card */}
      <div className={styles.inputCard}>
        <textarea
          className={styles.requestInput}
          placeholder="What do you want to build? e.g. 'Write a PRD and architecture doc for the Wraptors mobile app onboarding flow'"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={4}
          disabled={running}
        />
        <div className={styles.controls}>
          <select
            className={styles.projectSelect}
            value={project}
            onChange={(e) => setProject(e.target.value)}
            disabled={running}
          >
            {PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <div className={styles.actions}>
            {running && (
              <button className={styles.stopBtn} onClick={handleStop}>
                Stop
              </button>
            )}
            <button
              className={`${styles.runBtn} ${running || !request.trim() ? styles.runBtnDisabled : ''}`}
              onClick={handleRun}
              disabled={running || !request.trim()}
            >
              {running ? (
                <><span className={styles.spinner} /> Running…</>
              ) : (
                'Run Orchestration →'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Execution log */}
      {log.length > 0 && (
        <div className={styles.logSection}>
          <div className={styles.logFeed}>
            {log.map((entry) => (
              <LogEntryCard key={entry.id} entry={entry} />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}

function LogEntryCard({ entry }: { entry: LogEntry }) {
  const agent = entry.agentId ? AGENT_CONFIGS[entry.agentId] : null

  if (entry.type === 'init') {
    return (
      <div className={styles.logInit}>
        <span className={styles.logIcon}>◈</span>
        {entry.text}
      </div>
    )
  }

  if (entry.type === 'plan') {
    return (
      <div className={styles.logPlan}>
        <div className={styles.logPlanHeader}>
          <span className={styles.logIcon}>📋</span>
          <strong>Plan</strong>
        </div>
        {entry.reasoning && <p className={styles.logReasoning}>{entry.reasoning}</p>}
        <div className={styles.logAgentChips}>
          {entry.agents?.map((id) => {
            const a = AGENT_CONFIGS[id]
            return (
              <span key={id} className={styles.agentChip}>
                <span className={styles.agentChipAvatar}>{a?.avatar}</span>
                {a?.name ?? id}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  if (entry.type === 'agent_start' || entry.type === 'agent_token' || entry.type === 'agent_done') {
    return (
      <div className={styles.logAgent}>
        <div className={styles.logAgentHeader}>
          <div className={styles.logAgentAvatarWrap}>{agent?.avatar ?? '🤖'}</div>
          <div className={styles.logAgentMeta}>
            <span className={styles.logAgentName}>{agent?.name ?? entry.agentId}</span>
            {agent?.title && <span className={styles.logAgentTitle}>{agent.title}</span>}
          </div>
          <div className={styles.logAgentStatus}>
            {entry.isStreaming
              ? <span className={styles.streamingDot} />
              : <span className={styles.doneBadge}>done</span>
            }
            {entry.task && <span className={styles.taskLabel}>{entry.task}</span>}
          </div>
        </div>
        {entry.text && (
          <div className={styles.logAgentOutput}>
            <ReactMarkdown>{entry.text}</ReactMarkdown>
            {entry.isStreaming && <span className={styles.cursor} />}
          </div>
        )}
      </div>
    )
  }

  if (entry.type === 'summary') {
    return (
      <div className={styles.logSummary}>
        <div className={styles.logSummaryHeader}>
          <span className={styles.logIcon}>✨</span>
          <strong>Summary</strong>
          {entry.isStreaming && <span className={styles.streamingDot} />}
        </div>
        <div className={styles.logSummaryContent}>
          <ReactMarkdown>{entry.text ?? ''}</ReactMarkdown>
          {entry.isStreaming && <span className={styles.cursor} />}
        </div>
      </div>
    )
  }

  if (entry.type === 'error') {
    return (
      <div className={styles.logError}>
        <span className={styles.logIcon}>⚠</span>
        {entry.text}
      </div>
    )
  }

  return null
}
