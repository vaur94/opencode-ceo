import type { Database } from "bun:sqlite"

import type { StageExecution } from "./types.ts"

function getStage(db: Database, id: string): StageExecution | null {
  return db
    .query<StageExecution, [string]>("SELECT * FROM stage_executions WHERE id = ?1")
    .get(id)
}

export function createStageExecution(db: Database, pipelineId: string, stage: string): StageExecution {
  const execution: StageExecution = {
    id: crypto.randomUUID(),
    pipeline_id: pipelineId,
    stage,
    status: "running",
    started_at: Date.now(),
    completed_at: null,
    agent_session: null,
    result: null,
    error: null,
    retry_count: 0,
  }

  db.prepare(
    `INSERT INTO stage_executions (
      id,
      pipeline_id,
      stage,
      status,
      started_at,
      completed_at,
      agent_session,
      result,
      error,
      retry_count
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  ).run(
    execution.id,
    execution.pipeline_id,
    execution.stage,
    execution.status,
    execution.started_at,
    execution.completed_at,
    execution.agent_session,
    execution.result,
    execution.error,
    execution.retry_count,
  )

  return execution
}

export function completeStage(db: Database, id: string, result: string): void {
  const existing = getStage(db, id)

  if (!existing) {
    throw new Error(`Stage execution not found: ${id}`)
  }

  db.prepare(
    `UPDATE stage_executions
      SET status = ?2,
          completed_at = ?3,
          result = ?4,
          error = NULL
      WHERE id = ?1`,
  ).run(id, "completed", Date.now(), result)
}

export function failStage(db: Database, id: string, error: string): void {
  const existing = getStage(db, id)

  if (!existing) {
    throw new Error(`Stage execution not found: ${id}`)
  }

  db.prepare(
    `UPDATE stage_executions
      SET status = ?2,
          completed_at = ?3,
          result = NULL,
          error = ?4,
          retry_count = retry_count + 1
      WHERE id = ?1`,
  ).run(id, "failed", Date.now(), error)
}

export function getStageHistory(db: Database, pipelineId: string): StageExecution[] {
  return db
    .query<StageExecution, [string]>(
      `SELECT * FROM stage_executions
        WHERE pipeline_id = ?1
        ORDER BY started_at ASC, rowid ASC`,
    )
    .all(pipelineId)
}
