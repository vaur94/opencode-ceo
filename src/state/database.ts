import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { Database } from "bun:sqlite"

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS pipeline_runs (
    id             TEXT PRIMARY KEY,
    session_id     TEXT NOT NULL,
    state          TEXT NOT NULL,
    previous_state TEXT,
    goal           TEXT NOT NULL,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL,
    metadata       TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS stage_executions (
    id             TEXT PRIMARY KEY,
    pipeline_id    TEXT NOT NULL REFERENCES pipeline_runs(id),
    stage          TEXT NOT NULL,
    status         TEXT NOT NULL,
    started_at     INTEGER NOT NULL,
    completed_at   INTEGER,
    agent_session  TEXT,
    result         TEXT,
    error          TEXT,
    retry_count    INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS artifacts (
    id            TEXT PRIMARY KEY,
    pipeline_id   TEXT NOT NULL REFERENCES pipeline_runs(id),
    stage         TEXT NOT NULL,
    type          TEXT NOT NULL,
    path          TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS idx_artifact_pipeline ON artifacts(pipeline_id)",
  "CREATE INDEX IF NOT EXISTS idx_pipeline_session ON pipeline_runs(session_id)",
  "CREATE INDEX IF NOT EXISTS idx_stage_pipeline ON stage_executions(pipeline_id)",
]

export function initializeDatabase(db: Database): Database {
  db.run("PRAGMA journal_mode=WAL;")

  for (const statement of MIGRATIONS) {
    db.run(statement)
  }

  return db
}

export function getDatabase(directory: string): Database {
  const stateDirectory = join(directory, ".ceo")
  const databasePath = join(stateDirectory, "state.db")

  mkdirSync(stateDirectory, { recursive: true })

  const db = new Database(databasePath, {
    create: true,
    strict: true,
  })

  return initializeDatabase(db)
}
