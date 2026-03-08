import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Database } from "bun:sqlite"

import { createPipeline } from "../../../src/state/pipeline-store.ts"
import { getDatabase } from "../../../src/state/database.ts"
import { listArtifacts, readArtifact, writeArtifact } from "../../../src/state/artifact-manager.ts"

describe("artifact manager", () => {
  let db: Database
  let testDir: string

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "ceo-artifact-"))
    db = getDatabase(testDir)
  })

  afterEach(() => {
    db.close()
    rmSync(testDir, { force: true, recursive: true })
  })

  test("writes and reads a JSON artifact with matching content", () => {
    const pipeline = createPipeline(db, "session-1", "Store artifact")
    const payload = { summary: "Decompose complete", step: 1 }

    writeArtifact(db, pipeline.id, "decompose", "plan", payload)

    const recovered = readArtifact(db, pipeline.id, "decompose", "plan")

    expect(recovered).toEqual(payload)
  })

  test("writes artifact to the expected path", () => {
    const pipeline = createPipeline(db, "session-2", "Path check")
    const path = writeArtifact(db, pipeline.id, "decompose", "plan", { ready: true })

    expect(path).toBe(join(testDir, ".ceo", "artifacts", pipeline.id, "decompose", "plan.json"))
    expect(existsSync(path)).toBeTrue()
  })

  test("lists registered artifacts for a pipeline", () => {
    const pipeline = createPipeline(db, "session-3", "List artifacts")

    const firstPath = writeArtifact(db, pipeline.id, "decompose", "plan", { stage: "decompose" })
    const secondPath = writeArtifact(db, pipeline.id, "implement", "decision", { approved: true })

    const artifacts = listArtifacts(db, pipeline.id)
    const planArtifact = artifacts.find((artifact) => artifact.type === "plan")
    const decisionArtifact = artifacts.find((artifact) => artifact.type === "decision")

    expect(artifacts).toHaveLength(2)
    expect(planArtifact).not.toBeUndefined()
    expect(decisionArtifact).not.toBeUndefined()

    expect(planArtifact).toMatchObject({
      pipeline_id: pipeline.id,
      stage: "decompose",
      type: "plan",
      path: firstPath,
    })
    expect(decisionArtifact).toMatchObject({
      pipeline_id: pipeline.id,
      stage: "implement",
      type: "decision",
      path: secondPath,
    })
    expect(planArtifact?.created_at).toBeGreaterThan(0)
    expect(decisionArtifact?.created_at).toBeGreaterThan(0)
  })
})
