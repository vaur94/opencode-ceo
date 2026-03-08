import type { Database } from "bun:sqlite"

import type { PipelineRun, PipelineState } from "./types.ts"

function getPipelineRow(db: Database, id: string): PipelineRun | null {
  return db
    .query<PipelineRun, [string]>("SELECT * FROM pipeline_runs WHERE id = ?1")
    .get(id)
}

export function createPipeline(db: Database, sessionId: string, goal: string): PipelineRun {
  const pipeline: PipelineRun = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    state: "intake",
    previous_state: null,
    goal,
    created_at: Date.now(),
    updated_at: Date.now(),
    metadata: null,
  }

  pipeline.updated_at = pipeline.created_at

  db.prepare(
    `INSERT INTO pipeline_runs (
      id,
      session_id,
      state,
      previous_state,
      goal,
      created_at,
      updated_at,
      metadata
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  ).run(
    pipeline.id,
    pipeline.session_id,
    pipeline.state,
    pipeline.previous_state,
    pipeline.goal,
    pipeline.created_at,
    pipeline.updated_at,
    pipeline.metadata,
  )

  return pipeline
}

export function getPipeline(db: Database, id: string): PipelineRun | null {
  return getPipelineRow(db, id)
}

export function getPipelineBySession(db: Database, sessionId: string): PipelineRun | null {
  return db
    .query<PipelineRun, [string]>("SELECT * FROM pipeline_runs WHERE session_id = ?1")
    .get(sessionId)
}

export function updatePipelineState(db: Database, id: string, newState: PipelineState): void {
  const existing = getPipelineRow(db, id)

  if (!existing) {
    throw new Error(`Pipeline not found: ${id}`)
  }

  db.prepare(
    `UPDATE pipeline_runs
      SET state = ?2,
          previous_state = ?3,
          updated_at = ?4
      WHERE id = ?1`,
  ).run(id, newState, existing.state, Date.now())
}

export function listActivePipelines(db: Database): PipelineRun[] {
  return db.query(
    `SELECT * FROM pipeline_runs
      WHERE state NOT IN ('completed', 'failed')
      ORDER BY created_at ASC`,
  ).all() as PipelineRun[]
}
