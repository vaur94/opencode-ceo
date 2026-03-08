import type { Database } from "bun:sqlite"

import { getPipeline, updatePipelineState } from "../state/pipeline-store.js"
import type { PipelineRun } from "../state/types.js"
import {
  createGate,
  getGate,
  getGatesForPipeline,
  getPendingGate,
  resolveGate,
  type Gate,
} from "../state/gate-store.js"
import { GATE_TIMEOUT_MS } from "./constants.js"
import type { GateConfig, PipelineState } from "./types.js"

export type GateResult =
  | { approved: true }
  | { approved: false; reason: string; gateId: string }

function ensurePipelineExists(db: Database, pipelineId: string): PipelineRun {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  return pipeline
}

export function checkGate(
  db: Database,
  pipelineId: string,
  gateName: string,
  config: GateConfig,
): GateResult {
  const pipeline = ensurePipelineExists(db, pipelineId)

  if (config.autoApprove) {
    return { approved: true }
  }

  const existing = getPendingGate(db, pipelineId, gateName)

  if (existing) {
    const timeout = config.timeoutMs ?? GATE_TIMEOUT_MS

    if (Date.now() - existing.requested_at > timeout) {
      resolveGate(db, existing.id, "timeout", "timeout")
      updatePipelineState(db, pipelineId, "failed")
      return { approved: false, reason: "Gate timed out", gateId: existing.id }
    }

    return { approved: false, reason: "Gate pending", gateId: existing.id }
  }

  const gate = createGate(db, pipelineId, gateName)

  if (pipeline.state !== "blocked") {
    updatePipelineState(db, pipelineId, "blocked")
  }

  return { approved: false, reason: "Gate created, awaiting approval", gateId: gate.id }
}

export function approveGate(db: Database, gateId: string): void {
  const gate = getGate(db, gateId)

  if (!gate) {
    throw new Error(`Gate not found: ${gateId}`)
  }

  const pipeline = ensurePipelineExists(db, gate.pipeline_id)
  resolveGate(db, gateId, "approved", "user")

  if (pipeline.state === "blocked") {
    const resumeState = pipeline.previous_state as PipelineState | null

    if (!resumeState) {
      throw new Error(`Blocked pipeline ${pipeline.id} cannot resume without a previous state`)
    }

    updatePipelineState(db, pipeline.id, resumeState)
  }
}

export function denyGate(db: Database, gateId: string): void {
  const gate = getGate(db, gateId)

  if (!gate) {
    throw new Error(`Gate not found: ${gateId}`)
  }

  resolveGate(db, gateId, "denied", "user")
  ensurePipelineExists(db, gate.pipeline_id)
  updatePipelineState(db, gate.pipeline_id, "failed")
}

export function getGateStatus(db: Database, pipelineId: string): Gate[] {
  ensurePipelineExists(db, pipelineId)
  return getGatesForPipeline(db, pipelineId)
}
