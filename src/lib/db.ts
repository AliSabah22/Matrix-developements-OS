import Database from 'better-sqlite3'
import path from 'path'
import type { AgentId } from '@/types'

const DB_PATH = path.join(process.cwd(), 'company-os.db')

let db: Database.Database

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }
  return db
}

function initSchema(database: Database.Database): void {
  // Core legacy tables (preserved as-is)
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      agent_id    TEXT NOT NULL,
      priority    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'active',
      context     TEXT,
      output      TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      message     TEXT NOT NULL,
      type        TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status
      ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_conversations_agent
      ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created
      ON activity(created_at DESC);
  `)

  // New tables for vault-powered system
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'active',
      github_owner   TEXT,
      github_repo    TEXT,
      default_branch TEXT NOT NULL DEFAULT 'main',
      wiki_page      TEXT,
      description    TEXT,
      client_type    TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vault_tasks (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id     TEXT REFERENCES projects(id),
      agent_id       TEXT NOT NULL,
      title          TEXT NOT NULL,
      description    TEXT,
      status         TEXT NOT NULL DEFAULT 'queued',
      parent_task_id INTEGER REFERENCES vault_tasks(id),
      pr_url         TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_activity (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id      TEXT NOT NULL,
      task_id       INTEGER REFERENCES vault_tasks(id),
      activity_type TEXT NOT NULL,
      content       TEXT NOT NULL,
      timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id   TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id),
      messages   TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_vault_tasks_project
      ON vault_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_vault_tasks_agent
      ON vault_tasks(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_activity_agent
      ON agent_activity(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_activity_ts
      ON agent_activity(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_agent
      ON sessions(agent_id);
  `)

  // Seed default projects if table is empty
  const projectCount = database.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }
  if (projectCount.n === 0) {
    const insert = database.prepare(`
      INSERT INTO projects (id, name, status, github_owner, github_repo, default_branch, wiki_page, description, client_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insert.run('wraptors-saas', 'Wraptors SaaS', 'active', 'matrix-developments', 'wraptors-saas', 'dev', 'projects/wraptors-saas.md', 'OS for high-end automotive wrap, PPF, tint, and detailing shops', 'vertical-saas')
    insert.run('archstudio', 'ArchStudio', 'active', 'matrix-developments', 'archstudio', 'dev', 'projects/archstudio.md', 'Custom project management and client portal for an architecture firm', 'custom-software')
    insert.run('multi-tenant-platform', 'Multi-Tenant Platform', 'active', 'matrix-developments', 'multi-tenant-platform', 'main', 'projects/multi-tenant-platform.md', 'Shared infrastructure to scale the vertical SaaS model to new industries', 'internal-platform')
  }
}

export interface ConversationRow {
  id: number
  agent_id: string
  role: string
  content: string
  created_at: string
}

export interface TaskRow {
  id: number
  title: string
  agent_id: AgentId
  priority: 'high' | 'medium' | 'low'
  status: 'active' | 'done' | 'blocked' | 'review'
  context: string | null
  output: string | null
  created_at: string
  updated_at: string
}

export interface ActivityRow {
  id: number
  agent_id: AgentId
  message: string
  type: 'done' | 'alert' | 'updated' | 'report'
  created_at: string
}

export interface CreateTaskInput {
  title: string
  agent_id: string
  priority: 'high' | 'medium' | 'low'
  status?: 'active' | 'done' | 'blocked' | 'review'
  context?: string
  output?: string
}

export interface UpdateTaskInput {
  title?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'done' | 'blocked' | 'review'
  context?: string
  output?: string
}

export function getConversation(agentId: string): ConversationRow[] {
  try {
    const database = getDb()
    const stmt = database.prepare(
      'SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at ASC'
    )
    return stmt.all(agentId) as ConversationRow[]
  } catch (err) {
    throw new Error(`Failed to load conversation for agent ${agentId}: ${String(err)}`)
  }
}

export function saveMessage(agentId: string, role: string, content: string): void {
  try {
    const database = getDb()
    const stmt = database.prepare(
      'INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)'
    )
    stmt.run(agentId, role, content)
  } catch (err) {
    throw new Error(`Failed to save message for agent ${agentId}: ${String(err)}`)
  }
}

export function clearConversation(agentId: string): void {
  try {
    const database = getDb()
    const stmt = database.prepare('DELETE FROM conversations WHERE agent_id = ?')
    stmt.run(agentId)
  } catch (err) {
    throw new Error(`Failed to clear conversation for agent ${agentId}: ${String(err)}`)
  }
}

export function getTasks(filter?: string): TaskRow[] {
  try {
    const database = getDb()
    if (filter) {
      const stmt = database.prepare(
        'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC'
      )
      return stmt.all(filter) as TaskRow[]
    }
    const stmt = database.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
    return stmt.all() as TaskRow[]
  } catch (err) {
    throw new Error(`Failed to load tasks: ${String(err)}`)
  }
}

export function getTaskById(id: number): TaskRow | null {
  try {
    const database = getDb()
    const stmt = database.prepare('SELECT * FROM tasks WHERE id = ?')
    return (stmt.get(id) as TaskRow | undefined) ?? null
  } catch (err) {
    throw new Error(`Failed to load task ${id}: ${String(err)}`)
  }
}

export function createTask(task: CreateTaskInput): TaskRow {
  try {
    const database = getDb()
    const stmt = database.prepare(`
      INSERT INTO tasks (title, agent_id, priority, status, context, output)
      VALUES (@title, @agent_id, @priority, @status, @context, @output)
    `)
    const result = stmt.run({
      title: task.title,
      agent_id: task.agent_id,
      priority: task.priority,
      status: task.status ?? 'active',
      context: task.context ?? null,
      output: task.output ?? null,
    })
    const row = database
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(result.lastInsertRowid) as TaskRow
    return row
  } catch (err) {
    throw new Error(`Failed to create task: ${String(err)}`)
  }
}

export function updateTask(id: number, updates: UpdateTaskInput): TaskRow | null {
  try {
    const database = getDb()
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?')
      values.push(updates.priority)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.context !== undefined) {
      fields.push('context = ?')
      values.push(updates.context)
    }
    if (updates.output !== undefined) {
      fields.push('output = ?')
      values.push(updates.output)
    }

    if (fields.length === 0) {
      return (database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined) ?? null
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const stmt = database.prepare(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
    )
    stmt.run(...values)

    return (database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined) ?? null
  } catch (err) {
    throw new Error(`Failed to update task ${id}: ${String(err)}`)
  }
}

export function updateTaskStatus(
  id: number,
  status: 'active' | 'done' | 'blocked' | 'review'
): TaskRow | null {
  return updateTask(id, { status })
}

export function getActivity(limit: number = 20): ActivityRow[] {
  try {
    const database = getDb()
    const stmt = database.prepare(
      'SELECT * FROM activity ORDER BY created_at DESC LIMIT ?'
    )
    return stmt.all(limit) as ActivityRow[]
  } catch (err) {
    throw new Error(`Failed to load activity: ${String(err)}`)
  }
}

export function createActivity(
  agentId: string,
  message: string,
  type: string
): ActivityRow {
  try {
    const database = getDb()
    const stmt = database.prepare(
      'INSERT INTO activity (agent_id, message, type) VALUES (?, ?, ?)'
    )
    const result = stmt.run(agentId, message, type)
    const row = database
      .prepare('SELECT * FROM activity WHERE id = ?')
      .get(result.lastInsertRowid) as ActivityRow
    return row
  } catch (err) {
    throw new Error(`Failed to create activity: ${String(err)}`)
  }
}

// ============================================================
// Projects
// ============================================================

export interface ProjectRow {
  id: string
  name: string
  status: string
  github_owner: string | null
  github_repo: string | null
  default_branch: string
  wiki_page: string | null
  description: string | null
  client_type: string | null
  created_at: string
}

export function getProjects(): ProjectRow[] {
  return getDb().prepare('SELECT * FROM projects ORDER BY created_at ASC').all() as ProjectRow[]
}

export function getProject(id: string): ProjectRow | null {
  return (getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined) ?? null
}

export interface CreateProjectInput {
  id: string
  name: string
  status?: string
  github_owner?: string
  github_repo?: string
  default_branch?: string
  wiki_page?: string
  description?: string
  client_type?: string
}

export function createProject(input: CreateProjectInput): ProjectRow {
  const db = getDb()
  db.prepare(`
    INSERT INTO projects (id, name, status, github_owner, github_repo, default_branch, wiki_page, description, client_type)
    VALUES (@id, @name, @status, @github_owner, @github_repo, @default_branch, @wiki_page, @description, @client_type)
  `).run({
    id: input.id,
    name: input.name,
    status: input.status ?? 'active',
    github_owner: input.github_owner ?? null,
    github_repo: input.github_repo ?? null,
    default_branch: input.default_branch ?? 'main',
    wiki_page: input.wiki_page ?? null,
    description: input.description ?? null,
    client_type: input.client_type ?? null,
  })
  return getProject(input.id)!
}

export function updateProject(id: string, updates: Partial<Omit<ProjectRow, 'id' | 'created_at'>>): ProjectRow | null {
  const db = getDb()
  const fields: string[] = []
  const vals: unknown[] = []
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k} = ?`)
    vals.push(v)
  }
  if (!fields.length) return getProject(id)
  vals.push(id)
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getProject(id)
}

// ============================================================
// Vault Tasks
// ============================================================

export interface VaultTaskRow {
  id: number
  project_id: string | null
  agent_id: string
  title: string
  description: string | null
  status: 'queued' | 'in_progress' | 'blocked' | 'done'
  parent_task_id: number | null
  pr_url: string | null
  created_at: string
  updated_at: string
}

export function getVaultTasks(projectId?: string): VaultTaskRow[] {
  const db = getDb()
  if (projectId) {
    return db.prepare('SELECT * FROM vault_tasks WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as VaultTaskRow[]
  }
  return db.prepare('SELECT * FROM vault_tasks ORDER BY created_at DESC').all() as VaultTaskRow[]
}

export function createVaultTask(input: {
  project_id?: string
  agent_id: string
  title: string
  description?: string
  status?: VaultTaskRow['status']
  parent_task_id?: number
}): VaultTaskRow {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO vault_tasks (project_id, agent_id, title, description, status, parent_task_id)
    VALUES (@project_id, @agent_id, @title, @description, @status, @parent_task_id)
  `).run({
    project_id: input.project_id ?? null,
    agent_id: input.agent_id,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'queued',
    parent_task_id: input.parent_task_id ?? null,
  })
  return db.prepare('SELECT * FROM vault_tasks WHERE id = ?').get(result.lastInsertRowid) as VaultTaskRow
}

export function updateVaultTaskStatus(id: number, status: VaultTaskRow['status']): void {
  getDb().prepare('UPDATE vault_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)
}

// ============================================================
// Agent Activity (vault system)
// ============================================================

export interface AgentActivityRow {
  id: number
  agent_id: string
  task_id: number | null
  activity_type: string
  content: string
  timestamp: string
}

export function getAgentActivity(limit = 50): AgentActivityRow[] {
  return getDb().prepare('SELECT * FROM agent_activity ORDER BY timestamp DESC LIMIT ?').all(limit) as AgentActivityRow[]
}

export function createAgentActivity(input: {
  agent_id: string
  task_id?: number
  activity_type: string
  content: string
}): AgentActivityRow {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO agent_activity (agent_id, task_id, activity_type, content)
    VALUES (@agent_id, @task_id, @activity_type, @content)
  `).run({
    agent_id: input.agent_id,
    task_id: input.task_id ?? null,
    activity_type: input.activity_type,
    content: input.content,
  })
  return db.prepare('SELECT * FROM agent_activity WHERE id = ?').get(result.lastInsertRowid) as AgentActivityRow
}

// ============================================================
// Sessions
// ============================================================

export interface SessionRow {
  id: number
  agent_id: string
  project_id: string | null
  messages: string
  created_at: string
  updated_at: string
}

export interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function getSession(id: number): SessionRow | null {
  return (getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined) ?? null
}

export function getSessionsForAgent(agentId: string): SessionRow[] {
  return getDb().prepare('SELECT * FROM sessions WHERE agent_id = ? ORDER BY updated_at DESC').all(agentId) as SessionRow[]
}

export function createSession(agentId: string, projectId?: string): SessionRow {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO sessions (agent_id, project_id, messages) VALUES (?, ?, ?)'
  ).run(agentId, projectId ?? null, '[]')
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid) as SessionRow
}

export function appendSessionMessage(sessionId: number, message: SessionMessage): void {
  const db = getDb()
  const session = getSession(sessionId)
  if (!session) return
  const messages: SessionMessage[] = JSON.parse(session.messages)
  messages.push(message)
  db.prepare('UPDATE sessions SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(messages), sessionId)
}
