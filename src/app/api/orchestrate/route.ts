// src/app/api/orchestrate/route.ts
// Streaming orchestrator endpoint — decomposes requests and runs multiple agents

import { NextRequest } from "next/server";
import { orchestrate, OrchestratorEvent } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request: userRequest, selectedProject } = body as {
      request: string;
      selectedProject?: string;
    };

    if (!userRequest?.trim()) {
      return new Response(JSON.stringify({ error: "Request is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: OrchestratorEvent) => {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          await orchestrate({
            request: userRequest,
            selectedProject,
            onEvent: send,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
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
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
