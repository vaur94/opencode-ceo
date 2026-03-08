import type { Database } from "bun:sqlite"

import type { PipelineRun } from "../state/types.js"
import type { PipelineState } from "./types.js"
import { VALID_TRANSITIONS, TERMINAL_STATES } from "./constants.js"
import { InvalidTransitionError } from "./errors.js"
import { getPipeline, updatePipelineState } from "../state/pipeline-store.js"
import { createStageExecution } from "../state/stage-store.js"

export function validateTransition(from: PipelineState, to: PipelineState): boolean {
  if (TERMINAL_STATES.includes(from)) {
    return false
  }

  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function transitionPipeline(
  db: Database,
  pipelineId: string,
  targetState: PipelineState,
): PipelineRun {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  const from = pipeline.state as PipelineState

  if (!validateTransition(from, targetState)) {
    throw new InvalidTransitionError(from, targetState)
  }

  updatePipelineState(db, pipelineId, targetState)
  createStageExecution(db, pipelineId, targetState)

  return getPipeline(db, pipelineId) as PipelineRun
}
