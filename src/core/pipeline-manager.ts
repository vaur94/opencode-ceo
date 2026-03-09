import type { Database } from "bun:sqlite"

import { createPipeline, getPipeline } from "../state/pipeline-store.js"
import { getStageHistory } from "../state/stage-store.js"
import type { PipelineRun, PipelineState } from "../state/types.js"

function inferNextState(currentState: PipelineState): PipelineState {
  switch (currentState) {
    case "intake":
      return "decompose"
    case "decompose":
      return "implement"
    case "implement":
      return "review"
    case "review":
      return "test"
    case "test":
      return "deliver"
    case "deliver":
      return "completed"
    default:
      return currentState
  }
}

export function createNewPipeline(db: Database, sessionId: string, goal: string): PipelineRun {
  return createPipeline(db, sessionId, goal)
}

export function advancePipeline(db: Database, pipelineId: string): PipelineState {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  const history = getStageHistory(db, pipelineId)
  const latestStage = history.at(-1)

  if (!latestStage || latestStage.status !== "completed") {
    return pipeline.state
  }

  return inferNextState(pipeline.state)
}

export function resumePipeline(db: Database, pipelineId: string): PipelineRun {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  if (pipeline.state !== "interrupted") {
    return pipeline
  }

  const history = getStageHistory(db, pipelineId)
  const lastStage = history.at(-1)

  if (!lastStage || history.length === 0) {
    return pipeline
  }

  const resumedState = lastStage.stage as PipelineState
  db.prepare(
    `UPDATE pipeline_runs
      SET state = ?2,
          previous_state = ?3,
          updated_at = ?4
      WHERE id = ?1`,
  ).run(pipelineId, resumedState, pipeline.previous_state, Date.now())

  const resumed = getPipeline(db, pipelineId)

  if (!resumed) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  return resumed
}
