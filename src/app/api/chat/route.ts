// src/app/api/chat/route.ts
// Streaming Claude API endpoint — builds dynamic system prompts from the vault

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompt-builder";
import { AgentId, AGENT_CONFIGS } from "@/config/agents";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      messages,
      selectedProjects,
    }: {
      agentId: AgentId;
      messages: { role: "user" | "assistant"; content: string }[];
      selectedProjects?: string[];
    } = body;

    const systemPrompt = await buildSystemPrompt({ agentId, selectedProjects });
    const agentConfig = AGENT_CONFIGS[agentId];
    const model = agentConfig?.model ?? "claude-sonnet-4-6";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sdkStream = client.messages.stream({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages,
          });

          for await (const event of sdkStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({
                type: "text",
                text: event.delta.text,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          const finalMsg = await sdkStream.finalMessage();
          const done = JSON.stringify({
            type: "done",
            usage: finalMsg.usage,
            model: finalMsg.model,
          });
          controller.enqueue(encoder.encode(`data: ${done}\n\n`));
        } catch (err) {
          const errData = JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
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
