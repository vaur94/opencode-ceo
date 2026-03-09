import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Database } from "bun:sqlite"

import { createNewPipeline } from "../../../src/core/pipeline-manager.ts"
import {
  runDecomposeStage,
  runDeliverStage,
  runImplementStage,
  runIntakeStage,
  runReviewStage,
  runTestStage,
  type PipelineStageContext,
} from "../../../src/pipelines/feature-pipeline.ts"
import { createTestDatabase, createMockToolContext } from "../../helpers/test-utils.ts"

const cleanupDirectories: string[] = []
const cleanupDatabases: Database[] = []

function createProjectDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "opencode-ceo-pipeline-"))
  cleanupDirectories.push(directory)
  writeFileSync(join(directory, "package.json"), "{}")
  writeFileSync(join(directory, "bun.lockb"), "")
  return directory
}

function createContext(pipelineId?: string): PipelineStageContext {
  const db = createTestDatabase()
  const toolContext = createMockToolContext()
  const directory = createProjectDirectory()

  cleanupDatabases.push(db)

  const pipeline = pipelineId
    ? { id: pipelineId }
    : createNewPipeline(db, toolContext.sessionID, "Run feature pipeline")

  return {
    pipelineId: pipeline.id,
    directory,
    sessionID: toolContext.sessionID,
    db,
    delegate: async (agent, prompt) => `${agent}: ${prompt}`,
    prepareBranch: async (_directory, activePipelineId, slug) => ({ success: true, branchName: `ceo/${activePipelineId}/${slug}` }),
    preparePr: async () => ({ success: true, url: "https://github.com/example/repo/pull/1" }),
    ask: async () => {},
  }
}

async function runPipelineToStage(targetStage: "intake" | "decompose" | "implement" | "review" | "test" | "deliver") {
  const ctx = createContext()

  const intake = await runIntakeStage(ctx)
  if (targetStage === "intake") return { ctx, result: intake }

  const decompose = await runDecomposeStage(ctx)
  if (targetStage === "decompose") return { ctx, result: decompose }

  const implement = await runImplementStage(ctx)
  if (targetStage === "implement") return { ctx, result: implement }

  const review = await runReviewStage(ctx)
  if (targetStage === "review") return { ctx, result: review }

  const testResult = await runTestStage(ctx)
  if (targetStage === "test") return { ctx, result: testResult }

  const deliver = await runDeliverStage(ctx)
  return { ctx, result: deliver }
}

afterEach(() => {
  while (cleanupDatabases.length > 0) {
    cleanupDatabases.pop()?.close()
  }

  while (cleanupDirectories.length > 0) {
    const directory = cleanupDirectories.pop()

    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("feature pipeline stage handlers", () => {
  test("runIntakeStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("intake")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })

  test("runDecomposeStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("decompose")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })

  test("runImplementStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("implement")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })

  test("runReviewStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("review")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })

  test("runTestStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("test")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })

  test("runDeliverStage returns a successful stage result", async () => {
    const { result } = await runPipelineToStage("deliver")

    expect(result).toEqual({
      success: true,
      output: expect.any(String),
    })
  })
})
