// src/lib/persistence.ts
// Prisma-based persistence for sessions, messages, projects, tasks, orchestrations.
// This is SEPARATE from src/lib/db.ts (better-sqlite3) which serves legacy /ops routes.

import { PrismaClient } from "@prisma/client";

// ============================================================
// Singleton Prisma client (avoids connection leaks in dev)
// ============================================================
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ============================================================
// SESSION HELPERS
// ============================================================

/**
 * Get or create a session for a specific agent + project combination.
 * projectSlug is the project's URL slug ("wraptors-saas", etc.) or null for all-projects scope.
 */
export async function getOrCreateSession(
  agentId: string,
  projectSlug?: string | null
): Promise<string> {
  const existing = await prisma.session.findFirst({
    where: { agentId, projectSlug: projectSlug ?? null },
    orderBy: { lastMessageAt: "desc" },
  });

  if (existing) return existing.id;

  const session = await prisma.session.create({
    data: { agentId, projectSlug: projectSlug ?? null },
  });
  return session.id;
}

export async function listSessionsForAgent(agentId: string, limit = 20) {
  return prisma.session.findMany({
    where: { agentId },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
}

export async function getSessionWithMessages(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function createNewSession(
  agentId: string,
  projectSlug?: string | null
) {
  return prisma.session.create({
    data: { agentId, projectSlug: projectSlug ?? null },
  });
}

export async function updateSessionTitle(sessionId: string, title: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { title: title.slice(0, 100) },
  });
}

export async function toggleSessionPin(sessionId: string) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  return prisma.session.update({
    where: { id: sessionId },
    data: { isPinned: !session.isPinned },
  });
}

export async function deleteSession(sessionId: string) {
  return prisma.session.delete({ where: { id: sessionId } });
}

// ============================================================
// MESSAGE HELPERS
// ============================================================

export async function appendMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  metadata?: Record<string, unknown>
) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        sessionId,
        role,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    await tx.session.update({
      where: { id: sessionId },
      data: { lastMessageAt: new Date() },
    });

    // Auto-generate session title from first user message if not set
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: { title: true },
    });

    if (!session?.title && role === "user") {
      await tx.session.update({
        where: { id: sessionId },
        data: { title: content.slice(0, 80) },
      });
    }

    return message;
  });
}

export async function getRecentMessages(sessionId: string, limit = 50) {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return messages.reverse();
}

export function formatMessagesForApi(
  messages: { role: string; content: string }[]
) {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

// ============================================================
// PROJECT HELPERS
// ============================================================

export async function listProjects() {
  return prisma.project.findMany({
    where: { status: { not: "archived" } },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tasks: true } } },
  });
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: { tasks: true },
  });
}

export async function ensureProjectsExist() {
  const seedProjects = [
    {
      slug: "wraptors-saas",
      name: "Wraptors SaaS",
      description: "Vertical SaaS for automotive wrap/PPF/tint shops",
      clientType: "client",
      wikiPage: "projects/wraptors-saas.md",
    },
    {
      slug: "archstudio",
      name: "ArchStudio",
      description: "Custom software for architecture firm",
      clientType: "client",
      wikiPage: "projects/archstudio.md",
    },
    {
      slug: "multi-tenant-platform",
      name: "Multi-Tenant Platform",
      description: "Internal vertical SaaS platform",
      clientType: "internal",
      wikiPage: "projects/multi-tenant-platform.md",
    },
  ];

  for (const p of seedProjects) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
}

// ============================================================
// TASK HELPERS
// ============================================================

export async function createTask(data: {
  title: string;
  description?: string;
  projectId?: string;
  agentId?: string;
  priority?: string;
  parentTaskId?: string;
  orchestrationId?: string;
}) {
  return prisma.task.create({ data });
}

export async function updateTaskStatus(
  taskId: string,
  status: "queued" | "in_progress" | "blocked" | "done" | "cancelled"
) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
  });
}

// ============================================================
// ORCHESTRATION HELPERS
// ============================================================

export async function createOrchestration(data: {
  userPrompt: string;
  projectId?: string;
}) {
  return prisma.orchestration.create({ data });
}

export async function completeOrchestration(id: string, summary: string) {
  return prisma.orchestration.update({
    where: { id },
    data: { status: "completed", summary, completedAt: new Date() },
  });
}

// ============================================================
// AGENT ACTIVITY (live feed)
// ============================================================

export async function logActivity(data: {
  agentId: string;
  activityType: string;
  content: string;
  orchestrationId?: string;
  taskId?: string;
}) {
  return prisma.agentActivity.create({ data });
}

export async function getRecentActivity(limit = 50) {
  return prisma.agentActivity.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}
