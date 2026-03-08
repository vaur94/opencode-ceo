import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { Database } from "bun:sqlite"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { getDatabase, initializeDatabase } from "../../../src/state/database.ts"
import {
  createPipeline,
  getPipeline,
  getPipelineBySession,
  listActivePipelines,
  updatePipelineState,
} from "../../../src/state/pipeline-store.ts"

describe("pipeline store", () => {
  let db: Database

  beforeEach(() => {
    db = initializeDatabase(new Database(":memory:", { strict: true }))
  })

  afterEach(() => {
    db.close()
  })

  test("creates and fetches a pipeline run", () => {
    const created = createPipeline(db, "session-1", "Ship the feature")
    const stored = getPipeline(db, created.id)

    expect(stored).not.toBeNull()
    expect(stored).toEqual(created)
    expect(created.state).toBe("intake")
    expect(created.previous_state).toBeNull()
  })

  test("returns the matching pipeline for a session without leaking other sessions", () => {
    const first = createPipeline(db, "session-alpha", "Alpha goal")
    createPipeline(db, "session-beta", "Beta goal")

    expect(getPipelineBySession(db, "session-alpha")).toEqual(first)
    expect(getPipelineBySession(db, "missing-session")).toBeNull()
  })

  test("updates pipeline state and records the previous state", () => {
    const created = createPipeline(db, "session-2", "Move the pipeline")

    updatePipelineState(db, created.id, "implement")

    const updated = getPipeline(db, created.id)

    expect(updated).not.toBeNull()
    expect(updated?.state).toBe("implement")
    expect(updated?.previous_state).toBe("intake")
    expect(updated?.updated_at).toBeGreaterThanOrEqual(created.updated_at)
  })

  test("lists only active pipelines", () => {
    const active = createPipeline(db, "active-session", "Still running")
    const completed = createPipeline(db, "completed-session", "Already done")
    const failed = createPipeline(db, "failed-session", "Failed run")

    updatePipelineState(db, completed.id, "completed")
    updatePipelineState(db, failed.id, "failed")

    const activePipeline = getPipeline(db, active.id)

    expect(activePipeline).not.toBeNull()

    if (!activePipeline) {
      throw new Error("Expected active pipeline to exist")
    }

    expect(listActivePipelines(db)).toEqual([activePipeline])
  })

  test("enables WAL mode when opening the on-disk database", () => {
    const directory = mkdtempSync(join(tmpdir(), "opencode-ceo-state-"))

    try {
      const fileDb = getDatabase(directory)
      const row = fileDb.query("PRAGMA journal_mode;").get() as { journal_mode: string } | null

      expect(row?.journal_mode.toLowerCase()).toBe("wal")

      fileDb.close()
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
})
