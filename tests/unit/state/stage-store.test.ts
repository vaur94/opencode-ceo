import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"

import { initializeDatabase } from "../../../src/state/database.ts"
import { createPipeline } from "../../../src/state/pipeline-store.ts"
import {
  completeStage,
  createStageExecution,
  failStage,
  getStageHistory,
} from "../../../src/state/stage-store.ts"

describe("stage store", () => {
  let db: Database

  beforeEach(() => {
    db = initializeDatabase(new Database(":memory:", { strict: true }))
  })

  afterEach(() => {
    db.close()
  })

  test("creates a stage execution and returns it in history", () => {
    const pipeline = createPipeline(db, "session-1", "Test stages")
    const stage = createStageExecution(db, pipeline.id, "implement")

    expect(getStageHistory(db, pipeline.id)).toEqual([stage])
  })

  test("completes a stage and stores the result", () => {
    const pipeline = createPipeline(db, "session-2", "Complete stage")
    const stage = createStageExecution(db, pipeline.id, "review")

    completeStage(db, stage.id, "Looks good")

    const [updated] = getStageHistory(db, pipeline.id)

    expect(updated?.status).toBe("completed")
    expect(updated?.result).toBe("Looks good")
    expect(updated?.error).toBeNull()
    expect(updated?.completed_at).not.toBeNull()
  })

  test("fails a stage and increments the retry count", () => {
    const pipeline = createPipeline(db, "session-3", "Fail stage")
    const stage = createStageExecution(db, pipeline.id, "test")

    failStage(db, stage.id, "Command exited with status 1")

    const [updated] = getStageHistory(db, pipeline.id)

    expect(updated?.status).toBe("failed")
    expect(updated?.result).toBeNull()
    expect(updated?.error).toBe("Command exited with status 1")
    expect(updated?.retry_count).toBe(1)
    expect(updated?.completed_at).not.toBeNull()
  })

  test("returns only the stage history for the requested pipeline", () => {
    const firstPipeline = createPipeline(db, "session-a", "First pipeline")
    const secondPipeline = createPipeline(db, "session-b", "Second pipeline")
    const firstStage = createStageExecution(db, firstPipeline.id, "implement")
    createStageExecution(db, secondPipeline.id, "review")

    expect(getStageHistory(db, firstPipeline.id)).toEqual([firstStage])
  })
})
