import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { Database } from "bun:sqlite"

import { createTestDatabase } from "../../helpers/test-utils.ts"
import { createCompactionHandler } from "../../../src/context/compaction-handler.ts"
import { packPipelineContext } from "../../../src/context/context-packer.ts"
import { restoreFromDatabase } from "../../../src/context/context-restorer.ts"
import { createPipeline, updatePipelineState } from "../../../src/state/pipeline-store.ts"
import {
  completeStage,
  createStageExecution,
  getStageHistory,
} from "../../../src/state/stage-store.ts"

describe("compaction handler", () => {
  let db: Database

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  test("packPipelineContext returns a compact string with pipeline ID and state", () => {
    const pipeline = createPipeline(db, "session-pack", "Ship compaction recovery")
    updatePipelineState(db, pipeline.id, "implement")
    const firstStage = createStageExecution(db, pipeline.id, "decompose")
    createStageExecution(db, pipeline.id, "implement")

    completeStage(db, firstStage.id, "done")

    const storedPipeline = restoreFromDatabase(db, "session-pack")

    if (!storedPipeline) {
      throw new Error("Expected pipeline to exist")
    }

    const packed = packPipelineContext(storedPipeline, getStageHistory(db, pipeline.id), 3)

    expect(packed).toContain(`Pipeline ${pipeline.id}`)
    expect(packed).toContain("state=implement")
    expect(packed).toContain("progress=1/2 stages")
    expect(packed).toContain("artifacts=3")
  })

  test("packPipelineContext truncates long goals", () => {
    const longGoal = `${"A very long goal ".repeat(20)}tail-marker`
    const pipeline = createPipeline(db, "session-long-goal", longGoal)

    const packed = packPipelineContext(pipeline, [], 0)

    expect(packed).toContain("goal=\"")
    expect(packed).not.toContain(longGoal)
    expect(packed).not.toContain("tail-marker")
  })

  test("packPipelineContext output stays within 500 characters", () => {
    const pipeline = createPipeline(db, "session-limit", "x".repeat(2_000))

    const packed = packPipelineContext(pipeline, [], 999)

    expect(packed.length).toBeLessThanOrEqual(500)
  })

  test("restoreFromDatabase returns the pipeline when found", () => {
    const created = createPipeline(db, "session-restore", "Recover pipeline state")
    updatePipelineState(db, created.id, "review")

    const restored = restoreFromDatabase(db, "session-restore")

    expect(restored).not.toBeNull()
    expect(restored?.id).toBe(created.id)
    expect(restored?.state).toBe("review")
  })

  test("restoreFromDatabase returns null when no pipeline exists", () => {
    expect(restoreFromDatabase(db, "missing-session")).toBeNull()
  })

  test("restoreFromDatabase returns the most recent pipeline for a session", () => {
    const first = createPipeline(db, "session-shared", "First attempt")
    const second = createPipeline(db, "session-shared", "Second attempt")

    db.prepare(
      `UPDATE pipeline_runs
       SET created_at = ?2, updated_at = ?3
       WHERE id = ?1`,
    ).run(first.id, 100, 100)

    db.prepare(
      `UPDATE pipeline_runs
       SET created_at = ?2, updated_at = ?3
       WHERE id = ?1`,
    ).run(second.id, 200, 200)

    const restored = restoreFromDatabase(db, "session-shared")

    expect(restored?.id).toBe(second.id)
  })

  test("compaction handler injects pipeline ID, state, and progress into context", async () => {
    const pipeline = createPipeline(db, "session-hook", "Resume after compaction")
    const firstStage = createStageExecution(db, pipeline.id, "decompose")
    createStageExecution(db, pipeline.id, "implement")

    completeStage(db, firstStage.id, "planned")
    updatePipelineState(db, pipeline.id, "implement")

    db.prepare(
      `INSERT INTO artifacts (id, pipeline_id, stage, type, path, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).run("artifact-1", pipeline.id, "decompose", "plan", "/tmp/plan.json", Date.now())

    const handleCompaction = createCompactionHandler(db)
    const output = { context: [] as string[] }

    await handleCompaction({ sessionID: "session-hook" }, output)

    expect(output.context).toHaveLength(1)
    expect(output.context[0]).toContain(`Pipeline ${pipeline.id}`)
    expect(output.context[0]).toContain("state=implement")
    expect(output.context[0]).toContain("progress=1/2 stages")
  })

  test("compaction handler skips context injection when no active pipeline exists", async () => {
    const handleCompaction = createCompactionHandler(db)
    const output = { context: [] as string[] }

    await handleCompaction({ sessionID: "missing-session" }, output)

    expect(output.context).toEqual([])
  })
})
