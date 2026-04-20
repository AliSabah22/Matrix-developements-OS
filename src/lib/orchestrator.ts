// src/lib/orchestrator.ts
// Meta-agent that decomposes natural language requests and routes to specialized agents

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompt-builder";
import { AgentId, AGENT_CONFIGS, ALL_AGENT_IDS } from "@/config/agents";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface OrchestratorOptions {
  request: string;
  selectedProject?: string;
  onEvent?: (event: OrchestratorEvent) => void;
}

export type OrchestratorEvent =
  | { type: "plan"; agents: AgentId[]; reasoning: string }
  | { type: "agent_start"; agentId: AgentId; task: string }
  | { type: "agent_token"; agentId: AgentId; text: string }
  | { type: "agent_done"; agentId: AgentId; output: string }
  | { type: "summary"; content: string }
  | { type: "error"; message: string };

export interface OrchestratorResult {
  plan: { agentId: AgentId; task: string }[];
  outputs: Record<AgentId, string>;
  summary: string;
}

// Agent descriptions used by the planner to pick agents
const AGENT_DESCRIPTIONS = Object.values(AGENT_CONFIGS)
  .map((a) => `- ${a.id} (${a.name}): ${a.description}`)
  .join("\n");

/**
 * Plan which agents are needed and what task each should do.
 * Returns an ordered list of { agentId, task } pairs.
 */
interface PlanResult {
  reasoning: string;
  agents: { agentId: AgentId; task: string }[];
}

async function planAgents(
  request: string,
  project: string | undefined
): Promise<PlanResult> {
  const projectLine = project
    ? `Active project context: ${project}`
    : "No specific project — general company scope.";

  const plannerPrompt = `You are the Matrix Developments orchestrator. A founder has given you a request.
Your job: decide which agents to involve and what specific task to give each one.

${projectLine}

Available agents:
${AGENT_DESCRIPTIONS}

RULES:
- Use the minimum necessary agents (1-4 max)
- Put them in the logical execution order
- Each task description must be specific and self-contained
- Return ONLY valid JSON, no markdown fences

Respond with this exact JSON shape:
{
  "reasoning": "one sentence explaining the plan",
  "agents": [
    { "agentId": "agent-id-here", "task": "specific task description" }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Request: ${request}`,
      },
    ],
    system: plannerPrompt,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Parse JSON — strip any accidental markdown fences
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    reasoning: string;
    agents: { agentId: string; task: string }[];
  };

  return {
    reasoning: parsed.reasoning,
    agents: parsed.agents.map((a) => ({
      agentId: a.agentId as AgentId,
      task: a.task,
    })),
  };
}

/**
 * Run a single agent on a specific task and return its full output.
 * Calls onEvent with streaming tokens.
 */
async function runAgent(
  agentId: AgentId,
  task: string,
  selectedProject: string | undefined,
  previousOutputs: Record<string, string>,
  onEvent?: (event: OrchestratorEvent) => void
): Promise<string> {
  const selectedProjects = selectedProject ? [selectedProject] : undefined;

  const priorContext =
    Object.keys(previousOutputs).length > 0
      ? "\n\n=== PRIOR AGENT OUTPUTS ===\n" +
        Object.entries(previousOutputs)
          .map(([id, out]) => `[${AGENT_CONFIGS[id as AgentId]?.name ?? id}]: ${out}`)
          .join("\n\n")
      : "";

  const systemPrompt = await buildSystemPrompt({
    agentId,
    selectedProjects,
    additionalContext: priorContext || undefined,
  });

  let fullOutput = "";

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: task }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullOutput += event.delta.text;
      onEvent?.({ type: "agent_token", agentId, text: event.delta.text });
    }
  }

  return fullOutput;
}

/**
 * Summarize all agent outputs into a coherent final response.
 */
async function summarize(
  request: string,
  outputs: Record<AgentId, string>,
  onEvent?: (event: OrchestratorEvent) => void
): Promise<string> {
  const outputsText = Object.entries(outputs)
    .map(
      ([id, out]) =>
        `### ${AGENT_CONFIGS[id as AgentId]?.name ?? id} output:\n${out}`
    )
    .join("\n\n");

  let summary = "";

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "You are a synthesis agent for Matrix Developments. Combine agent outputs into a clear, actionable summary for the founders. Be concise. Use markdown. No agent role-playing — just synthesize.",
    messages: [
      {
        role: "user",
        content: `Original request: ${request}\n\nAgent outputs:\n${outputsText}\n\nWrite a brief synthesis.`,
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      summary += event.delta.text;
      onEvent?.({ type: "summary", content: event.delta.text });
    }
  }

  return summary;
}

/**
 * Main orchestrator entry point.
 */
export async function orchestrate(
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { request, selectedProject, onEvent } = options;

  // 1. Plan
  let planResult: Awaited<ReturnType<typeof planAgents>>;
  try {
    planResult = await planAgents(request, selectedProject);
  } catch (err) {
    onEvent?.({
      type: "error",
      message: `Failed to plan: ${err instanceof Error ? err.message : String(err)}`,
    });
    throw err;
  }

  const validAgents = planResult.agents.filter((a) =>
    ALL_AGENT_IDS.includes(a.agentId)
  );

  onEvent?.({
    type: "plan",
    agents: validAgents.map((a) => a.agentId),
    reasoning: planResult.reasoning,
  });

  // 2. Run agents in sequence (each gets prior outputs as context)
  const outputs: Record<AgentId, string> = {} as Record<AgentId, string>;

  for (const { agentId, task } of validAgents) {
    onEvent?.({ type: "agent_start", agentId, task });
    try {
      const output = await runAgent(
        agentId,
        task,
        selectedProject,
        outputs,
        onEvent
      );
      outputs[agentId] = output;
      onEvent?.({ type: "agent_done", agentId, output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      outputs[agentId] = `[Error: ${msg}]`;
      onEvent?.({ type: "error", message: `${agentId} failed: ${msg}` });
    }
  }

  // 3. Summarize
  const summary = await summarize(request, outputs, onEvent);

  return {
    plan: validAgents,
    outputs,
    summary,
  };
}
