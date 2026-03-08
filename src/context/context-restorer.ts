import type { Database } from "bun:sqlite"

import type { PipelineRun } from "../state/types.js"

export function restoreFromDatabase(db: Database, sessionId: string): PipelineRun | null {
  return db
    .query<PipelineRun, [string]>(
      `SELECT * FROM pipeline_runs
       WHERE session_id = ?1
       ORDER BY updated_at DESC, created_at DESC, id DESC
       LIMIT 1`,
    )
    .get(sessionId)
}
