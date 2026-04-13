// src/app/api/chat/route.ts
// Claude API endpoint — builds dynamic system prompts from the wiki and routes MCP servers per agent

import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, getMcpServers } from "@/lib/prompt-builder";
import { AgentId } from "@/config/agents";

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

    // 1. Build the system prompt dynamically from the wiki
    const systemPrompt = await buildSystemPrompt({
      agentId,
      selectedProjects,
    });

    // 2. Get MCP servers for this agent
    const mcpServers = getMcpServers(agentId);

    // 3. Call Claude API
    // Note: mcp_servers is not supported in the standard messages API.
    // MCP server config is stored in agents.ts for future use when the
    // Claude API supports remote MCP connections per-request.
    void mcpServers; // referenced for future use

    const apiBody = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Claude API error:", error);
      return NextResponse.json(
        { error: "Failed to get response from Claude" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 4. Extract text content from response (handling MCP tool results too)
    const textContent = data.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    // Extract any MCP tool results
    const toolResults = data.content
      .filter((block: { type: string }) => block.type === "mcp_tool_result")
      .map((block: { content?: { text?: string }[] }) =>
        block.content?.[0]?.text || ""
      );

    return NextResponse.json({
      response: textContent,
      toolResults,
      model: data.model,
      usage: data.usage,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
