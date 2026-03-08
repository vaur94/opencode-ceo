import type { Database } from "bun:sqlite"

import { createPipeline, getPipeline } from "../state/pipeline-store.js"
import { getStageHistory } from "../state/stage-store.js"
import type { PipelineRun } from "../state/types.js"

export function createNewPipeline(db: Database, sessionId: string, goal: string): PipelineRun {
  return createPipeline(db, sessionId, goal)
}

export function resumePipeline(db: Database, pipelineId: string): PipelineRun {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  if (pipeline.state !== "interrupted") {
    return pipeline
  }

  getStageHistory(db, pipelineId)

  return pipeline
}
