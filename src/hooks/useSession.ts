// src/hooks/useSession.ts
// React hook for managing persistent conversations with agents

import { useState, useEffect, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Session {
  id: string;
  agentId: string;
  projectSlug: string | null;
  title: string | null;
  isPinned: boolean;
  createdAt: string;
  lastMessageAt: string;
  messages?: Message[];
}

/**
 * Loads the most recent persistent session for an agent+project on mount.
 * Returns messages to pre-populate the chat, and helpers for session management.
 */
export function useAgentSession(agentId: string, projectId?: string | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLatestSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions?agentId=${agentId}`);
      const data = await res.json();

      const matching = (data.sessions as Session[] ?? []).find(
        (s) => s.projectSlug === (projectId ?? null)
      );

      if (matching) {
        const fullRes = await fetch(`/api/sessions/${matching.id}`);
        const fullData = await fullRes.json();
        setSessionId(matching.id);
        setMessages(fullData.session?.messages ?? []);
      } else {
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [agentId, projectId]);

  useEffect(() => {
    loadLatestSession();
  }, [loadLatestSession]);

  // Start a brand-new conversation (doesn't delete the old one)
  const startNewSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, projectId: projectId ?? null }),
      });
      const data = await res.json();
      setSessionId(data.session.id);
      setMessages([]);
      return data.session.id as string;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [agentId, projectId]);

  return {
    sessionId,
    setSessionId,
    messages,
    setMessages,
    loading,
    error,
    startNewSession,
    reload: loadLatestSession,
  };
}

/**
 * Hook for listing all sessions for an agent (for the history sidebar)
 */
export function useSessionHistory(agentId: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions?agentId=${agentId}`);
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
