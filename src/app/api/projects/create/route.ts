// src/app/api/projects/create/route.ts
// Creates a new project: wiki page + database row + GitHub repo

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompt-builder";
import { createProject, getProject } from "@/lib/db";
import { writeFile } from "fs/promises";
import { join } from "path";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VAULT_PATH = process.env.MATRIX_BRAIN_PATH ?? "./matrix-brain";

interface CreateProjectBody {
  name: string;
  description: string;
  client_type: "vertical-saas" | "custom-software" | "internal-platform";
  github_owner?: string;
}

async function generateProjectId(name: string): Promise<string> {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

async function draftWikiPage(
  name: string,
  description: string,
  clientType: string
): Promise<string> {
  const systemPrompt = await buildSystemPrompt({ agentId: "product-manager" });
  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Draft a wiki page for a new project. Use the schema.md format.

Project name: ${name}
Description: ${description}
Type: ${clientType}
Date: ${today}

Write the full wiki page in markdown with proper frontmatter. Include these sections:
- Overview
- Status (set to "Active — Kickoff")
- Tech Stack (leave as TBD based on tech-standards.md)
- Agent Assignments (suggest based on project type)
- Key Decisions (leave empty for now)
- Open Questions (add initial questions for founders)`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function draftArchDoc(
  name: string,
  description: string,
  wikiContent: string
): Promise<string> {
  const systemPrompt = await buildSystemPrompt({ agentId: "cto-architect" });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Draft an initial architecture document for this new project.

Project: ${name}
Description: ${description}
Wiki draft:
${wikiContent}

Write a brief architecture overview in markdown covering:
- High-level system architecture
- Recommended tech stack with rationale
- Data model sketch (key entities)
- API structure overview
- Infrastructure approach
- Key technical decisions to make

Keep it concise — this is a starting point, not a full spec.`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const send = (
    controller: ReadableStreamDefaultController,
    event: Record<string, unknown>
  ) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = (await request.json()) as CreateProjectBody;
        const { name, description, client_type } = body;

        if (!name?.trim() || !description?.trim()) {
          send(controller, { type: "error", message: "Name and description are required" });
          controller.close();
          return;
        }

        const projectId = await generateProjectId(name);

        // Check if project already exists
        if (getProject(projectId)) {
          send(controller, {
            type: "error",
            message: `Project "${projectId}" already exists`,
          });
          controller.close();
          return;
        }

        // Step 1: Compass drafts wiki page
        send(controller, { type: "step", step: 1, message: "Compass is drafting the project wiki page…", agent: "product-manager" });

        let wikiContent: string;
        try {
          wikiContent = await draftWikiPage(name, description, client_type);
        } catch (err) {
          wikiContent = `---
title: ${name}
type: project
status: active
created: ${new Date().toISOString().split("T")[0]}
updated: ${new Date().toISOString().split("T")[0]}
tags: [project]
owner: founders
---

# ${name}

## Overview
${description}

## Status
Active — Kickoff

## Tech Stack
TBD — see [[company/tech-standards]]

## Agent Assignments
TBD

## Key Decisions
(none yet)

## Open Questions
- What is the target launch date?
- Who are the primary users?
`;
          send(controller, {
            type: "warning",
            message: `Wiki draft used fallback template: ${err instanceof Error ? err.message : String(err)}`,
          });
        }

        send(controller, { type: "step_done", step: 1, message: "Wiki page drafted" });

        // Step 2: Forge drafts architecture doc
        send(controller, { type: "step", step: 2, message: "Forge is drafting the initial architecture document…", agent: "cto-architect" });

        let archDoc: string;
        try {
          archDoc = await draftArchDoc(name, description, wikiContent);
        } catch (err) {
          archDoc = `# ${name} — Architecture Overview\n\nDraft pending. See wiki page for context.\n`;
          send(controller, {
            type: "warning",
            message: `Arch doc used fallback: ${err instanceof Error ? err.message : String(err)}`,
          });
        }

        send(controller, { type: "step_done", step: 2, message: "Architecture document drafted" });

        // Step 3: Write wiki page to vault
        send(controller, { type: "step", step: 3, message: "Writing wiki page to vault…" });

        const wikiPath = join(VAULT_PATH, "wiki", "projects", `${projectId}.md`);
        const archPath = join(VAULT_PATH, "wiki", "projects", `${projectId}-architecture.md`);

        try {
          await writeFile(wikiPath, wikiContent, "utf-8");
          await writeFile(archPath, archDoc, "utf-8");
          send(controller, {
            type: "step_done",
            step: 3,
            message: `Wiki page written to wiki/projects/${projectId}.md`,
          });
        } catch (err) {
          send(controller, {
            type: "warning",
            message: `Could not write to vault: ${err instanceof Error ? err.message : String(err)}`,
          });
        }

        // Step 4: Insert into database
        send(controller, { type: "step", step: 4, message: "Creating project in database…" });

        const repoSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const project = createProject({
          id: projectId,
          name,
          status: "active",
          github_owner: body.github_owner ?? "matrix-developments",
          github_repo: repoSlug,
          default_branch: "main",
          wiki_page: `projects/${projectId}.md`,
          description,
          client_type,
        });

        send(controller, { type: "step_done", step: 4, message: "Project created in database" });

        // Step 5: GitHub repo (requires GITHUB_TOKEN — note if missing)
        send(controller, { type: "step", step: 5, message: "GitHub repo setup…" });

        if (!process.env.GITHUB_TOKEN) {
          send(controller, {
            type: "warning",
            message: "GITHUB_TOKEN not set — skipping GitHub repo creation. Add it to .env.local to enable this step.",
          });
        } else {
          try {
            const ghRes = await fetch("https://api.github.com/user/repos", {
              method: "POST",
              headers: {
                "Accept": "application/vnd.github+json",
                "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: repoSlug,
                description,
                private: true,
                auto_init: true,
              }),
            });

            if (ghRes.ok) {
              const repo = await ghRes.json() as { html_url: string };
              send(controller, {
                type: "step_done",
                step: 5,
                message: `GitHub repo created: ${repo.html_url}`,
                url: repo.html_url,
              });
            } else {
              const err = await ghRes.text();
              send(controller, {
                type: "warning",
                message: `GitHub repo creation failed: ${err}`,
              });
            }
          } catch (err) {
            send(controller, {
              type: "warning",
              message: `GitHub API error: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }

        send(controller, {
          type: "complete",
          project,
          wikiPreview: wikiContent.slice(0, 500),
        });
      } catch (err) {
        send(controller, {
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
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
    },
  });
}
