'use client'

// src/hooks/useAgentActivity.ts
// React hook for consuming live agent activity from the SSE event stream

import { useEffect, useRef, useState } from 'react'
import type { AgentEvent } from '@/lib/events'

export interface ActivityItem {
  id: string
  type: AgentEvent['type']
  agentId?: string
  text: string
  timestamp: Date
}

export function useAgentActivity(maxItems = 50) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const esRef = useRef<EventSource | null>(null)
  let counter = useRef(0)

  useEffect(() => {
    const es = new EventSource('/api/events')
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent
        const item = parseEvent(event, ++counter.current)
        if (item) {
          setActivities((prev) => [item, ...prev].slice(0, maxItems))
        }
      } catch {
        // skip malformed events
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects on error
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [maxItems])

  return activities
}

function parseEvent(event: AgentEvent, id: number): ActivityItem | null {
  const timestamp = new Date()
  const sid = `${id}-${Date.now()}`

  switch (event.type) {
    case 'agent.started':
      return {
        id: sid,
        type: event.type,
        agentId: event.payload.agentId,
        text: `Started: ${event.payload.task}`,
        timestamp,
      }
    case 'agent.completed':
      return {
        id: sid,
        type: event.type,
        agentId: event.payload.agentId,
        text: event.payload.summary,
        timestamp,
      }
    case 'agent.message':
      return {
        id: sid,
        type: event.type,
        agentId: event.payload.agentId,
        text: event.payload.text.slice(0, 120),
        timestamp,
      }
    case 'task.created':
      return {
        id: sid,
        type: event.type,
        agentId: event.payload.agentId,
        text: `Task created: ${event.payload.title}`,
        timestamp,
      }
    case 'project.created':
      return {
        id: sid,
        type: event.type,
        text: `New project: ${event.payload.name}`,
        timestamp,
      }
    default:
      return null
  }
}
