import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  runDecomposeStage,
  runDeliverStage,
  runImplementStage,
  runIntakeStage,
  runReviewStage,
  runTestStage,
  type PipelineStageContext,
  type StageResult,
} from "../../src/pipelines/feature-pipeline.ts"
import { listArtifacts } from "../../src/state/artifact-manager.ts"
import { createPipeline, getPipeline } from "../../src/state/pipeline-store.ts"
import { getStageHistory } from "../../src/state/stage-store.ts"
import type { PipelineState } from "../../src/state/types.ts"
import { samplePipelineData } from "../helpers/fixtures.ts"
import { createMockToolContext, createTestDatabase } from "../helpers/test-utils.ts"

const cleanupDirectories: string[] = []

type StageExpectation = {
  name: Exclude<PipelineState, "completed" | "failed" | "blocked" | "interrupted">
  artifactType: "decision" | "plan" | "code-diff" | "review" | "test-result" | "pr-url"
  expectedState: PipelineState
  expectedPreviousState: PipelineState | null
  run: (ctx: PipelineStageContext) => Promise<StageResult>
}

const STAGES: StageExpectation[] = [
  {
    name: "intake",
    artifactType: "decision",
    expectedState: "decompose",
    expectedPreviousState: "intake",
    run: runIntakeStage,
  },
  {
    name: "decompose",
    artifactType: "plan",
    expectedState: "implement",
    expectedPreviousState: "decompose",
    run: runDecomposeStage,
  },
  {
    name: "implement",
    artifactType: "code-diff",
    expectedState: "review",
    expectedPreviousState: "implement",
    run: runImplementStage,
  },
  {
    name: "review",
    artifactType: "review",
    expectedState: "test",
    expectedPreviousState: "review",
    run: runReviewStage,
  },
  {
    name: "test",
    artifactType: "test-result",
    expectedState: "deliver",
    expectedPreviousState: "test",
    run: runTestStage,
  },
  {
    name: "deliver",
    artifactType: "pr-url",
    expectedState: "completed",
    expectedPreviousState: "deliver",
    run: runDeliverStage,
  },
]

function createProjectDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "opencode-ceo-e2e-"))
  cleanupDirectories.push(directory)
  writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "pipeline-e2e" }), "utf8")
  writeFileSync(join(directory, "bun.lockb"), "", "utf8")
  return directory
}

function createContext(): PipelineStageContext {
  const db = createTestDatabase()
  const toolContext = createMockToolContext()
  const directory = createProjectDirectory()
  const pipeline = createPipeline(db, toolContext.sessionID, samplePipelineData.goal)

  return {
    pipelineId: pipeline.id,
    directory,
    sessionID: toolContext.sessionID,
    db,
  }
}

afterEach(() => {
  while (cleanupDirectories.length > 0) {
    const directory = cleanupDirectories.pop()

    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("pipeline e2e integration", () => {
  test("runs the full six-stage pipeline and records SQLite state plus artifacts", async () => {
    const ctx = createContext()
    const originalCwd = process.cwd()

    try {
      process.chdir(ctx.directory)

      for (const [index, stage] of STAGES.entries()) {
        const result = await stage.run(ctx)

        expect(result).toEqual({
          success: true,
          output: expect.any(String),
        })

        const history = getStageHistory(ctx.db, ctx.pipelineId)
        const pipeline = getPipeline(ctx.db, ctx.pipelineId)
        const artifacts = listArtifacts(ctx.db, ctx.pipelineId)
        const recordedStages = history.map((entry) => entry.stage)
        const stageRecord = history.find((entry) => entry.stage === stage.name)
        const stageArtifact = artifacts.find(
          (artifact) => artifact.stage === stage.name && artifact.type === stage.artifactType,
        )

        expect(history).toHaveLength(index + 1)
        expect(recordedStages).toContain(stage.name)
        expect(stageRecord).toMatchObject({
          pipeline_id: ctx.pipelineId,
          stage: stage.name,
          status: "completed",
          result: result.output,
          error: null,
          retry_count: 0,
        })
        expect(stageRecord?.completed_at).not.toBeNull()

        expect(pipeline).not.toBeNull()
        expect(pipeline?.state).toBe(stage.expectedState)
        expect(pipeline?.previous_state).toBe(stage.expectedPreviousState)

        expect(artifacts).toHaveLength(index + 1)
        expect(stageArtifact).toBeDefined()
        expect(stageArtifact?.pipeline_id).toBe(ctx.pipelineId)
        expect(stageArtifact?.created_at).toBeGreaterThan(0)
        expect(stageArtifact && existsSync(stageArtifact.path)).toBeTrue()
      }

      const finalPipeline = getPipeline(ctx.db, ctx.pipelineId)
      const finalHistory = getStageHistory(ctx.db, ctx.pipelineId)
      const finalArtifacts = listArtifacts(ctx.db, ctx.pipelineId)

      expect(finalPipeline).not.toBeNull()
      expect(finalPipeline?.state).toBe("completed")
      expect(finalPipeline?.previous_state).toBe("deliver")
      expect(finalHistory.map((entry) => entry.stage).sort()).toEqual(
        STAGES.map((stage) => stage.name).sort(),
      )
      expect(finalArtifacts.map((artifact) => `${artifact.stage}:${artifact.type}`).sort()).toEqual(
        [
          "intake:decision",
          "decompose:plan",
          "implement:code-diff",
          "review:review",
          "test:test-result",
          "deliver:pr-url",
        ].sort(),
      )
    } finally {
      process.chdir(originalCwd)
      ctx.db.close()
    }
  })
})
