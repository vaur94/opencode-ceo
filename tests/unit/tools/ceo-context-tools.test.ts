import type { Database } from "bun:sqlite"
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { createMockToolContext, createTestDatabase } from "../../helpers/test-utils.ts"

const getDatabaseMock = mock((): Database => {
  throw new Error("Database mock has not been initialized")
})

mock.module("../../../src/state/database.js", () => ({
  getDatabase: getDatabaseMock,
}))

const { executeCeoContextPack, executeCeoContextRestore } = await import(
  "../../../src/tools/ceo-context-tools.ts"
)

describe("ceo_context_tools", () => {
  let db: Database | null = null

  function getFixtureDatabase(): Database {
    if (!db) {
      throw new Error("Test database fixture was not initialized")
    }

    return db
  }

  beforeEach(() => {
    db = createTestDatabase()
    getDatabaseMock.mockImplementation(() => getFixtureDatabase())
  })

  afterEach(() => {
		db?.close()
    db = null
    getDatabaseMock.mockClear()
  })

  test("packs pipeline context into a compact string", async () => {
    const fixtureDb = getFixtureDatabase()
    const context = createMockToolContext()

    fixtureDb
      .prepare(
        `INSERT INTO pipeline_runs (
          id, session_id, state, previous_state, goal, created_at, updated_at, metadata
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .run(
        "pipe-1",
        "session-1",
        "implement",
        "decompose",
        "Deliver a compact but complete context handoff for this pipeline with enough detail to verify truncation still stays inside the packing limit.",
        1,
        2,
        null,
      )

    fixtureDb
      .prepare(
        `INSERT INTO stage_executions (
          id, pipeline_id, stage, status, started_at, completed_at, agent_session, result, error, retry_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .run("stage-1", "pipe-1", "intake", "completed", 10, 11, null, "ok", null, 0)

    fixtureDb
      .prepare(
        `INSERT INTO stage_executions (
          id, pipeline_id, stage, status, started_at, completed_at, agent_session, result, error, retry_count
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      )
      .run("stage-2", "pipe-1", "decompose", "completed", 12, 13, null, "ok", null, 0)

    fixtureDb
      .prepare(
        `INSERT INTO artifacts (
          id, pipeline_id, stage, type, path, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .run("artifact-1", "pipe-1", "decompose", "plan", "/tmp/plan.json", 20)

    const result = await executeCeoContextPack({ pipeline_id: "pipe-1" }, context)

    expect(typeof result).toBe("string")
    expect(result.length).toBeLessThanOrEqual(500)
    expect(result).toContain("[CEO State] Pipeline pipe-1")
    expect(result).toContain("progress=2/2 stages")
    expect(result).toContain("artifacts=1")
  })

  test("restores pipeline state as a json string", async () => {
    const fixtureDb = getFixtureDatabase()
    const context = createMockToolContext()

    fixtureDb
      .prepare(
        `INSERT INTO pipeline_runs (
          id, session_id, state, previous_state, goal, created_at, updated_at, metadata
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .run(
        "pipe-restore",
        "session-restore",
        "review",
        "implement",
        "Restore this pipeline state",
        100,
        200,
        '{"source":"test"}',
      )

    const result = await executeCeoContextRestore({ session_id: "session-restore" }, context)
    const parsed = JSON.parse(result) as Record<string, unknown>

    expect(parsed.id).toBe("pipe-restore")
    expect(parsed.session_id).toBe("session-restore")
    expect(parsed.state).toBe("review")
    expect(parsed.previous_state).toBe("implement")
    expect(parsed.goal).toBe("Restore this pipeline state")
  })

  test("returns an error string when the pipeline is missing", async () => {
    const result = await executeCeoContextPack(
      { pipeline_id: "missing-pipeline" },
      createMockToolContext(),
    )

    expect(result).toBe("Error: Pipeline missing-pipeline not found")
  })

  test("returns a string when no session pipeline can be restored", async () => {
    const result = await executeCeoContextRestore(
      { session_id: "missing-session" },
      createMockToolContext(),
    )

    expect(result).toBe("No active pipeline found for session missing-session")
  })
})
