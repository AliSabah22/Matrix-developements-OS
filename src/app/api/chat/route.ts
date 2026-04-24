// src/app/api/chat/route.ts
// Streaming Claude API endpoint with conversation persistence.
// Every message is saved to the DB; sessions persist across browser visits.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompt-builder";
import { AgentId, AGENT_CONFIGS } from "@/config/agents";
import {
  getOrCreateSession,
  appendMessage,
  getRecentMessages,
  formatMessagesForApi,
} from "@/lib/persistence";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      messages: clientMessages, // full history sent by the client (used as fallback)
      selectedProjects,
      sessionId: providedSessionId, // if client already has a session
      projectId, // for session scoping (single slug or null)
    }: {
      agentId: AgentId;
      messages: { role: "user" | "assistant"; content: string }[];
      selectedProjects?: string[];
      sessionId?: string;
      projectId?: string | null;
    } = body;

    // 1. Resolve the persistent session
    const sessionId =
      providedSessionId ??
      (await getOrCreateSession(agentId, projectId ?? null));

    // 2. Extract the user's new message (last message in the client array)
    const userMessage =
      clientMessages[clientMessages.length - 1]?.content ?? "";

    // 3. Save user message to DB
    if (userMessage) {
      await appendMessage(sessionId, "user", userMessage);
    }

    // 4. Load full conversation history from DB for API context
    //    This ensures context is always correct even after page reloads
    const dbHistory = await getRecentMessages(sessionId, 50);
    const apiMessages = formatMessagesForApi(dbHistory);

    // 5. Build system prompt from vault
    const systemPrompt = await buildSystemPrompt({ agentId, selectedProjects });

    // 6. Use the per-agent model from config
    const agentConfig = AGENT_CONFIGS[agentId];
    const model = agentConfig?.model ?? "claude-sonnet-4-6";

    // 7. Stream response back to client
    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sdkStream = client.messages.stream({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: apiMessages,
          });

          for await (const event of sdkStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              assistantContent += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`
                )
              );
            }
          }

          const finalMsg = await sdkStream.finalMessage();

          // 8. Save the completed assistant response to DB
          if (assistantContent) {
            await appendMessage(sessionId, "assistant", assistantContent, {
              model: finalMsg.model,
              usage: finalMsg.usage,
            });
          }

          // 9. Send done event — include sessionId so the client can store it
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                sessionId,
                usage: finalMsg.usage,
                model: finalMsg.model,
              })}\n\n`
            )
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : String(err),
              })}\n\n`
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
