import type { Database } from "bun:sqlite"

import { AGENT_IDS } from "../agents/agent-registry.js"
import { GATE_NAMES } from "../core/constants.js"
import { checkGate } from "../core/gate-system.js"
import { loadConfig } from "../core/config.js"
import { validateTransition } from "../core/pipeline-fsm.js"
import { createNewPipeline, resumePipeline } from "../core/pipeline-manager.js"
import { createBranch } from "../github/branch-manager.js"
import { createPR } from "../github/pr-manager.js"
import type { PipelineState } from "../core/types.js"
import { detectStack } from "../stacks/detector.js"
import { readArtifact, writeArtifact } from "../state/artifact-manager.js"
import { getPipeline, updatePipelineState } from "../state/pipeline-store.js"
import { completeStage, createStageExecution, failStage } from "../state/stage-store.js"

export type PipelineStageContext = {
  pipelineId: string
  directory: string
  sessionID: string
  db: Database
}

export type StageResult = {
  success: boolean
  output: string
  error?: string
}

type ArtifactRecord = Record<string, unknown>

type GateConfigValue = { autoApprove: boolean; timeoutMs?: number }

function ensurePipelineId(ctx: PipelineStageContext, stage: PipelineState): string {
  const existing = getPipeline(ctx.db, ctx.pipelineId)

  if (existing) {
    resumePipeline(ctx.db, ctx.pipelineId)
    return existing.id
  }

  if (stage !== "intake") {
    throw new Error(`Pipeline not found: ${ctx.pipelineId}`)
  }

  return createNewPipeline(ctx.db, ctx.sessionID, `Feature pipeline for ${ctx.directory}`).id
}

function advancePipeline(db: Database, pipelineId: string, targetState: PipelineState): void {
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  if (pipeline.state === targetState) {
    return
  }

  if (!validateTransition(pipeline.state, targetState)) {
    throw new Error(`Invalid pipeline transition: ${pipeline.state} -> ${targetState}`)
  }

  updatePipelineState(db, pipelineId, targetState)
}

function requireArtifact(
  db: Database,
  pipelineId: string,
  stage: string,
  type: "decision" | "plan" | "code-diff" | "review" | "test-result" | "pr-url",
): ArtifactRecord {
  const artifact = readArtifact(db, pipelineId, stage, type)

  if (!artifact || typeof artifact !== "object") {
    throw new Error(`Missing artifact: ${stage}/${type}`)
  }

  return artifact as ArtifactRecord
}

function parseGateConfig(metadata: string | null, gateName: string): GateConfigValue {
  if (!metadata) {
    return { autoApprove: true }
  }

  try {
    const parsed = JSON.parse(metadata) as unknown
    const unwrapped =
      parsed && typeof parsed === "object" && "config" in parsed
        ? (parsed as { config?: unknown }).config
        : parsed

    if (unwrapped && typeof unwrapped === "object" && "gates" in unwrapped) {
      const gateValue = (unwrapped as { gates?: Record<string, unknown> }).gates?.[gateName]

      if (gateValue && typeof gateValue === "object" && "autoApprove" in gateValue) {
        const autoApprove = (gateValue as { autoApprove?: unknown }).autoApprove
        const timeoutMs = (gateValue as { timeoutMs?: unknown }).timeoutMs

        if (typeof autoApprove === "boolean") {
          return {
            autoApprove,
            timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
          }
        }
      }
    }

    const config = loadConfig(unwrapped)
    const gateMode = config.gates[gateName]

    if (gateMode) {
      return { autoApprove: gateMode === "auto" }
    }
  } catch {
    return { autoApprove: true }
  }

  return { autoApprove: true }
}

function runConfigurableGate(
  db: Database,
  pipelineId: string,
  gateName: string,
  directory: string,
): void {
  void directory
  const pipeline = getPipeline(db, pipelineId)

  if (!pipeline) {
    throw new Error(`Pipeline not found: ${pipelineId}`)
  }

  const result = checkGate(db, pipelineId, gateName, parseGateConfig(pipeline.metadata, gateName))

  if (!result.approved) {
    throw new Error(result.reason)
  }
}

function delegateStub(agentId: string, summary: string): string {
  if (!AGENT_IDS.includes(agentId as (typeof AGENT_IDS)[number])) {
    throw new Error(`Unknown delegation target: ${agentId}`)
  }

  return `${agentId} stub: ${summary}`
}

function failureResult(error: unknown): StageResult {
  return {
    success: false,
    output: "",
    error: error instanceof Error ? error.message : String(error),
  }
}

export async function runIntakeStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "intake")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "intake")

  try {
    const stack = detectStack(ctx.directory)
    const artifact = {
      pipelineId,
      directory: ctx.directory,
      sessionID: ctx.sessionID,
      stack,
      summary: `Detected ${stack.primaryLanguage} stack for ${ctx.directory}`,
    }

    writeArtifact(ctx.db, pipelineId, "intake", "decision", artifact)
    advancePipeline(ctx.db, pipelineId, "decompose")

    const output = `Intake complete for pipeline ${pipelineId}`
    completeStage(ctx.db, stageExecution.id, output)
    return { success: true, output }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}

export async function runDecomposeStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "decompose")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "decompose")

  try {
    const intakeArtifact = requireArtifact(ctx.db, pipelineId, "intake", "decision")
    const plan = delegateStub("ceo-architect", `planned work for ${pipelineId}`)

    writeArtifact(ctx.db, pipelineId, "decompose", "plan", {
      input: intakeArtifact,
      agent: "ceo-architect",
      plan,
    })
    runConfigurableGate(ctx.db, pipelineId, GATE_NAMES.APPROVE_PLAN, ctx.directory)
    advancePipeline(ctx.db, pipelineId, "implement")

    completeStage(ctx.db, stageExecution.id, plan)
    return { success: true, output: plan }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}

export async function runImplementStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "implement")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "implement")

  try {
    const planArtifact = requireArtifact(ctx.db, pipelineId, "decompose", "plan")
    const implementation = delegateStub("ceo-implementer", `implemented plan for ${pipelineId}`)

    writeArtifact(ctx.db, pipelineId, "implement", "code-diff", {
      input: planArtifact,
      agent: "ceo-implementer",
      result: implementation,
    })
    advancePipeline(ctx.db, pipelineId, "review")

    completeStage(ctx.db, stageExecution.id, implementation)
    return { success: true, output: implementation }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}

export async function runReviewStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "review")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "review")

  try {
    const codeChangeArtifact = requireArtifact(ctx.db, pipelineId, "implement", "code-diff")
    const review = delegateStub("ceo-reviewer", `reviewed implementation for ${pipelineId}`)

    writeArtifact(ctx.db, pipelineId, "review", "review", {
      input: codeChangeArtifact,
      agent: "ceo-reviewer",
      findings: review,
    })
    runConfigurableGate(ctx.db, pipelineId, GATE_NAMES.APPROVE_REVIEW, ctx.directory)
    advancePipeline(ctx.db, pipelineId, "test")

    completeStage(ctx.db, stageExecution.id, review)
    return { success: true, output: review }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}

export async function runTestStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "test")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "test")

  try {
    const reviewArtifact = requireArtifact(ctx.db, pipelineId, "review", "review")
    const testReport = delegateStub("ceo-tester", `validated review findings for ${pipelineId}`)

    writeArtifact(ctx.db, pipelineId, "test", "test-result", {
      input: reviewArtifact,
      agent: "ceo-tester",
      report: testReport,
    })
    advancePipeline(ctx.db, pipelineId, "deliver")

    completeStage(ctx.db, stageExecution.id, testReport)
    return { success: true, output: testReport }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}

export async function runDeliverStage(ctx: PipelineStageContext): Promise<StageResult> {
  const pipelineId = ensurePipelineId(ctx, "deliver")
  const stageExecution = createStageExecution(ctx.db, pipelineId, "deliver")

  try {
    const intakeArtifact = requireArtifact(ctx.db, pipelineId, "intake", "decision")
    const planArtifact = requireArtifact(ctx.db, pipelineId, "decompose", "plan")
    const codeChangeArtifact = requireArtifact(ctx.db, pipelineId, "implement", "code-diff")
    const reviewArtifact = requireArtifact(ctx.db, pipelineId, "review", "review")
    const testArtifact = requireArtifact(ctx.db, pipelineId, "test", "test-result")
    const branchResult = await createBranch(ctx.directory, pipelineId, "feature")
    const branchName = branchResult.success ? branchResult.branchName : "ceo/no-git"
    const prResult = await createPR(
      ctx.directory,
      "CEO: Feature delivery",
      "Automated delivery by opencode-ceo",
    )
    const prUrl = prResult.success
      ? prResult.url
      : branchResult.success
        ? `branch-only: ${branchName}`
        : "no-pr"
    const output = `Delivery complete: ${prUrl}`

    writeArtifact(ctx.db, pipelineId, "deliver", "pr-url", {
      branchName,
      prUrl,
      intakeArtifact,
      planArtifact,
      codeChangeArtifact,
      reviewArtifact,
      testArtifact,
    })
    runConfigurableGate(ctx.db, pipelineId, GATE_NAMES.APPROVE_DELIVERY, ctx.directory)
    advancePipeline(ctx.db, pipelineId, "completed")

    completeStage(ctx.db, stageExecution.id, output)
    return { success: true, output }
  } catch (error) {
    const failed = failureResult(error)
    failStage(ctx.db, stageExecution.id, failed.error ?? "Unknown stage failure")
    return failed
  }
}
