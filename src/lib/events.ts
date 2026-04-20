// src/lib/events.ts
// In-process SSE event bus for live dashboard updates
// Clients subscribe via GET /api/events; server pushes via emitEvent()

type Listener = (event: AgentEvent) => void

export type AgentEvent =
  | { type: "task.created"; payload: { taskId: number; projectId: string; agentId: string; title: string } }
  | { type: "task.updated"; payload: { taskId: number; status: string } }
  | { type: "agent.started"; payload: { agentId: string; task: string } }
  | { type: "agent.message"; payload: { agentId: string; text: string } }
  | { type: "agent.tool_call"; payload: { agentId: string; tool: string } }
  | { type: "agent.completed"; payload: { agentId: string; summary: string } }
  | { type: "project.created"; payload: { projectId: string; name: string } }
  | { type: "project.updated"; payload: { projectId: string; status: string } }

// Global listener registry (process-scoped, works for single-process dev server)
const listeners = new Set<Listener>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitEvent(event: AgentEvent): void {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // skip failed listeners
    }
  }
}
