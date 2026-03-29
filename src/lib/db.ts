import Database from 'better-sqlite3'
import path from 'path'

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
  `)
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
  agent_id: string
  priority: string
  status: string
  context: string | null
  output: string | null
  created_at: string
  updated_at: string
}

export interface ActivityRow {
  id: number
  agent_id: string
  message: string
  type: string
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
  const database = getDb()
  const stmt = database.prepare(
    'SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at ASC'
  )
  return stmt.all(agentId) as ConversationRow[]
}

export function saveMessage(agentId: string, role: string, content: string): void {
  const database = getDb()
  const stmt = database.prepare(
    'INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)'
  )
  stmt.run(agentId, role, content)
}

export function clearConversation(agentId: string): void {
  const database = getDb()
  const stmt = database.prepare('DELETE FROM conversations WHERE agent_id = ?')
  stmt.run(agentId)
}

export function getTasks(filter?: string): TaskRow[] {
  const database = getDb()
  if (filter) {
    const stmt = database.prepare(
      'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC'
    )
    return stmt.all(filter) as TaskRow[]
  }
  const stmt = database.prepare('SELECT * FROM tasks ORDER BY created_at DESC')
  return stmt.all() as TaskRow[]
}

export function createTask(task: CreateTaskInput): TaskRow {
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
}

export function updateTask(id: number, updates: UpdateTaskInput): TaskRow | null {
  const database = getDb()
  const fields: string[] = []
  const values: (string | null)[] = []

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
    return database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | null
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(String(id))

  const stmt = database.prepare(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`
  )
  stmt.run(...values)

  return database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | null
}

export function getActivity(limit: number = 50): ActivityRow[] {
  const database = getDb()
  const stmt = database.prepare(
    'SELECT * FROM activity ORDER BY created_at DESC LIMIT ?'
  )
  return stmt.all(limit) as ActivityRow[]
}

export function createActivity(
  agentId: string,
  message: string,
  type: string
): ActivityRow {
  const database = getDb()
  const stmt = database.prepare(
    'INSERT INTO activity (agent_id, message, type) VALUES (?, ?, ?)'
  )
  const result = stmt.run(agentId, message, type)
  const row = database
    .prepare('SELECT * FROM activity WHERE id = ?')
    .get(result.lastInsertRowid) as ActivityRow
  return row
}
