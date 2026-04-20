// src/app/api/events/route.ts
// SSE endpoint for live dashboard updates — clients long-poll this

import { subscribe, AgentEvent } from "@/lib/events";
import { getAgentActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send recent activity as initial burst
      try {
        const recent = getAgentActivity(10);
        for (const row of recent.reverse()) {
          const event: AgentEvent = {
            type: "agent.message",
            payload: { agentId: row.agent_id, text: row.content },
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
      } catch {
        // DB might not be initialized yet on first request
      }

      // Subscribe to live events
      unsubscribe = subscribe((event) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      });

      // Keepalive every 25 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 25000);
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
