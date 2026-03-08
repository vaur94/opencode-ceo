import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { Database } from "bun:sqlite"

import { createTestDatabase } from "../helpers/test-utils.ts"
import { createCompactionHandler } from "../../src/context/compaction-handler.ts"
import { packPipelineContext } from "../../src/context/context-packer.ts"
import { restoreFromDatabase } from "../../src/context/context-restorer.ts"
import {
  createPipeline,
  getPipelineBySession,
  updatePipelineState,
} from "../../src/state/pipeline-store.ts"
import {
  completeStage,
  createStageExecution,
  getStageHistory,
} from "../../src/state/stage-store.ts"

describe("compaction integration", () => {
  let db: Database

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  test("state survives compaction", async () => {
    const sessionId = "integration-compaction-session"
    const pipeline = createPipeline(db, sessionId, "Resume after context compaction")
    const decomposeStage = createStageExecution(db, pipeline.id, "decompose")
    const implementStage = createStageExecution(db, pipeline.id, "implement")

    completeStage(db, decomposeStage.id, "Plan approved")
    updatePipelineState(db, pipeline.id, "implement")

    db.prepare(
      `INSERT INTO artifacts (id, pipeline_id, stage, type, path, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).run("artifact-compaction", pipeline.id, "decompose", "plan", "/tmp/plan.json", Date.now())

    const handleCompaction = createCompactionHandler(db)
    const output = { context: [] as string[] }

    await handleCompaction({ sessionID: sessionId }, output)

    expect(output.context).toHaveLength(1)
    expect(output.context[0]).toContain(`Pipeline ${pipeline.id}`)
    expect(output.context[0]).toContain("state=implement")
    expect(output.context[0]).toContain("progress=1/2 stages")
    expect(output.context[0]).toContain("artifacts=1")

    const restored = restoreFromDatabase(db, sessionId)

    expect(restored).not.toBeNull()
    expect(restored?.id).toBe(pipeline.id)
    expect(restored?.session_id).toBe(sessionId)
    expect(restored?.state).toBe("implement")
    expect(restored?.previous_state).toBe("intake")

    const sqlitePipeline = getPipelineBySession(db, sessionId)
    const stageHistory = getStageHistory(db, pipeline.id)
    const restoredDecomposeStage = stageHistory.find((stage) => stage.id === decomposeStage.id)
    const restoredImplementStage = stageHistory.find((stage) => stage.id === implementStage.id)

    expect(sqlitePipeline?.id).toBe(pipeline.id)
    expect(stageHistory).toHaveLength(2)
    expect(restoredDecomposeStage?.stage).toBe("decompose")
    expect(restoredDecomposeStage?.status).toBe("completed")
    expect(restoredImplementStage?.id).toBe(implementStage.id)
    expect(restoredImplementStage?.status).toBe("running")
  })

  test("context pack produces compact string", () => {
    const pipeline = createPipeline(
      db,
      "integration-pack-session",
      "Implement a compaction-safe recovery path that keeps the current pipeline state available even after the chat context is aggressively truncated by the host runtime and must be reconstructed from SQLite.",
    )
    const decomposeStage = createStageExecution(db, pipeline.id, "decompose")

    completeStage(db, decomposeStage.id, "Decomposed the work")
    updatePipelineState(db, pipeline.id, "implement")
    createStageExecution(db, pipeline.id, "implement")

    const storedPipeline = restoreFromDatabase(db, "integration-pack-session")

    if (!storedPipeline) {
      throw new Error("Expected pipeline to be restorable from SQLite")
    }

    const packed = packPipelineContext(storedPipeline, getStageHistory(db, pipeline.id), 12)

    expect(packed.length).toBeLessThanOrEqual(500)
    expect(packed).toContain(`Pipeline ${pipeline.id}`)
    expect(packed).toContain("state=implement")
    expect(packed).toContain("progress=1/2 stages")
    expect(packed).toContain("artifacts=12")
  })

  test("pipeline resumes from interrupted state", () => {
    const sessionId = "integration-resume-session"
    const pipeline = createPipeline(db, sessionId, "Continue implementation after compaction")
    const decomposeStage = createStageExecution(db, pipeline.id, "decompose")

    completeStage(db, decomposeStage.id, "Implementation plan ready")
    updatePipelineState(db, pipeline.id, "decompose")
    updatePipelineState(db, pipeline.id, "implement")

    const implementStage = createStageExecution(db, pipeline.id, "implement")
    const restored = restoreFromDatabase(db, sessionId)

    expect(restored).not.toBeNull()
    expect(restored?.id).toBe(pipeline.id)
    expect(restored?.state).toBe("implement")
    expect(restored?.previous_state).toBe("decompose")
    expect(getPipelineBySession(db, sessionId)?.id).toBe(pipeline.id)

    const stages = getStageHistory(db, pipeline.id)
    const restoredDecomposeStage = stages.find((stage) => stage.id === decomposeStage.id)
    const restoredImplementStage = stages.find((stage) => stage.id === implementStage.id)

    expect(stages).toHaveLength(2)
    expect(restoredDecomposeStage?.status).toBe("completed")
    expect(restoredImplementStage?.id).toBe(implementStage.id)
    expect(restoredImplementStage?.stage).toBe("implement")
    expect(restoredImplementStage?.status).toBe("running")
  })
})
