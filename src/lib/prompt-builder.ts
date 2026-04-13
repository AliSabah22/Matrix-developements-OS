// src/lib/prompt-builder.ts
// Compiles the full system prompt for a given agent from wiki pages + skills

import { AgentConfig, AGENT_CONFIGS, AgentId } from "@/config/agents";
import { loadWikiPages, loadSkills, loadWikiPage } from "./wiki-loader";
import { AgentConfig, AGENT_CONFIGS, AgentId, PROJECT_REPOS, CODE_CAPABLE_AGENTS } from "@/config/agents";

export interface PromptBuildOptions {
  agentId: AgentId;
  selectedProjects?: string[]; // e.g., ["wraptors-saas", "archstudio"]
  additionalContext?: string; // any extra context from the conversation
}

/**
 * Build the complete system prompt for an agent.
 *
 * This is the core integration point between Matrix Brain and Matrix OS.
 * It reads wiki pages + skill files from the vault and compiles them into
 * a single system prompt that gets sent to the Claude API.
 */
export async function buildSystemPrompt(
  options: PromptBuildOptions
): Promise<string> {
  const config = AGENT_CONFIGS[options.agentId];
  if (!config) throw new Error(`Unknown agent: ${options.agentId}`);

  // 1. Build the identity header
  const identity = buildIdentityBlock(config);

  // 2. Load always-on wiki pages (index + agent's own page + company pages)
  const alwaysLoadPaths = [config.wikiPages.self, ...config.wikiPages.alwaysLoad];
  const coreContext = await loadWikiPages(alwaysLoadPaths);

  // 3. Load project pages based on selection
  let projectContext = "";
  if (config.wikiPages.projectDependent && options.selectedProjects?.length) {
    const projectPaths = options.selectedProjects.map(
      (p) => `projects/${p}.md`
    );
    projectContext = await loadWikiPages(projectPaths);
  } else if (config.wikiPages.projectDependent) {
    // No project selected — load a brief summary from index only
    projectContext =
      "\n[No specific project selected. Refer to index.md for project list. Ask the founder which project to focus on.]\n";
  }

  // 4. Load skills
  const skillsContext = await loadSkills(config.skills);

  // 5. Compile the final prompt
  const systemPrompt = `${identity}

=== INSTITUTIONAL KNOWLEDGE (from Matrix Brain wiki) ===
${coreContext}

=== PROJECT CONTEXT ===
${projectContext}

=== SKILLS & EXPERTISE ===
The following skills define your domain expertise. Follow their frameworks and use their tools.
${skillsContext}

=== OPERATING RULES ===
1. You are an employee of Matrix Developments. The two co-founders have final authority on all decisions.
2. Stay within your defined responsibilities. If a task falls outside your lane, recommend which agent should handle it.
3. When you need to escalate to founders, be explicit: "This needs founder input because [reason]."
4. Reference wiki pages by name when your response draws from them.
5. If you need information that should be in the wiki but isn't, flag it: "This should be documented in [wiki page]."
6. Never commit the company to pricing, timelines, or scope without noting it needs founder approval.
7. When working on a specific project, stay focused on that project unless asked about cross-project concerns.
${options.additionalContext ? `\n=== ADDITIONAL CONTEXT ===\n${options.additionalContext}` : ""}`;

  return systemPrompt;
}

/**
 * Build the identity block — a concise description of who this agent is
 */
function buildIdentityBlock(config: AgentConfig): string {
  return `You are ${config.name}, the ${config.title} at Matrix Developments.

${config.description}

Department: ${config.department}
Your wiki page: wiki/${config.wikiPages.self}

Available MCP tools: ${
    config.mcpServers.length > 0
      ? config.mcpServers.map((s) => `${s.name} (${s.purpose})`).join(", ")
      : "None configured"
  }`;
}

/**
 * Get the MCP server configurations for an agent
 * These get passed to the Claude API call alongside the system prompt
 */
export function getMcpServers(agentId: AgentId) {
  const config = AGENT_CONFIGS[agentId];
  if (!config) return [];

  return config.mcpServers
    .filter((s) => s.url) // only remote MCP servers work with the API
    .map((s) => ({
      type: "url" as const,
      url: s.url!,
      name: s.name,
    }));
}
