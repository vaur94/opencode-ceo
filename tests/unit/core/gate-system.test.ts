import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { Database } from "bun:sqlite"

import { approveGate, checkGate, denyGate, getGateStatus } from "../../../src/core/gate-system.ts"
import { createNewPipeline } from "../../../src/core/pipeline-manager.ts"
import { getPipeline, updatePipelineState } from "../../../src/state/pipeline-store.ts"
import { createTestDatabase } from "../../helpers/test-utils.ts"

describe("gate system", () => {
  let db: Database

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  test("auto-approves when the gate is configured for automatic approval", () => {
    const pipeline = createNewPipeline(db, "session-auto", "Auto approve goal")
    updatePipelineState(db, pipeline.id, "decompose")

    const result = checkGate(db, pipeline.id, "approve-plan", { autoApprove: true })

    expect(result).toEqual({ approved: true })
    expect(getGateStatus(db, pipeline.id)).toEqual([])
    expect(getPipeline(db, pipeline.id)?.state).toBe("decompose")
  })

  test("creates a pending gate and blocks the pipeline for manual approval", () => {
    const pipeline = createNewPipeline(db, "session-manual", "Manual gate goal")
    updatePipelineState(db, pipeline.id, "review")

    const result = checkGate(db, pipeline.id, "approve-review", { autoApprove: false })

    if (result.approved) {
      throw new Error("Expected a pending gate")
    }

    const gates = getGateStatus(db, pipeline.id)

    expect(result).toMatchObject({
      approved: false,
      reason: "Gate created, awaiting approval",
    })
    expect(gates).toHaveLength(1)
    expect(gates[0]).toMatchObject({
      id: result.gateId,
      pipeline_id: pipeline.id,
      gate_name: "approve-review",
      status: "pending",
      resolved_at: null,
      resolved_by: null,
    })
    expect(getPipeline(db, pipeline.id)?.state).toBe("blocked")
  })

  test("approves a pending gate and resumes the pipeline", () => {
    const pipeline = createNewPipeline(db, "session-approve", "Approve gate goal")
    updatePipelineState(db, pipeline.id, "review")

    const result = checkGate(db, pipeline.id, "approve-review", { autoApprove: false })

    if (result.approved) {
      throw new Error("Expected a pending gate")
    }

    approveGate(db, result.gateId)

    const gates = getGateStatus(db, pipeline.id)
    expect(gates).toHaveLength(1)
    const [gate] = gates

    expect(gate?.status).toBe("approved")
    expect(gate?.resolved_at).not.toBeNull()
    expect(gate?.resolved_by).toBe("user")
    expect(getPipeline(db, pipeline.id)?.state).toBe("review")
  })

  test("denies a pending gate and fails the pipeline", () => {
    const pipeline = createNewPipeline(db, "session-deny", "Deny gate goal")
    updatePipelineState(db, pipeline.id, "deliver")

    const result = checkGate(db, pipeline.id, "approve-delivery", { autoApprove: false })

    if (result.approved) {
      throw new Error("Expected a pending gate")
    }

    denyGate(db, result.gateId)

    const gates = getGateStatus(db, pipeline.id)
    expect(gates).toHaveLength(1)
    const [gate] = gates

    expect(gate?.status).toBe("denied")
    expect(gate?.resolved_at).not.toBeNull()
    expect(gate?.resolved_by).toBe("user")
    expect(getPipeline(db, pipeline.id)?.state).toBe("failed")
  })

  test("times out a pending gate and fails the pipeline", async () => {
    const pipeline = createNewPipeline(db, "session-timeout", "Timeout gate goal")
    updatePipelineState(db, pipeline.id, "decompose")

    const firstResult = checkGate(db, pipeline.id, "approve-plan", { autoApprove: false, timeoutMs: 5 })

    if (firstResult.approved) {
      throw new Error("Expected a pending gate")
    }

    await Bun.sleep(15)

    const secondResult = checkGate(db, pipeline.id, "approve-plan", { autoApprove: false, timeoutMs: 5 })
    const gates = getGateStatus(db, pipeline.id)

    expect(secondResult).toEqual({
      approved: false,
      reason: "Gate timed out",
      gateId: firstResult.gateId,
    })
    expect(gates).toHaveLength(1)
    const [gate] = gates

    expect(gate?.status).toBe("timeout")
    expect(gate?.resolved_at).not.toBeNull()
    expect(gate?.resolved_by).toBe("timeout")
    expect(getPipeline(db, pipeline.id)?.state).toBe("failed")
  })

  test("returns all gates for a pipeline ordered by request time", () => {
    const pipeline = createNewPipeline(db, "session-status", "List gate status goal")
    updatePipelineState(db, pipeline.id, "decompose")

    const first = checkGate(db, pipeline.id, "approve-plan", { autoApprove: false })

    if (first.approved) {
      throw new Error("Expected first gate to be pending")
    }

    approveGate(db, first.gateId)
    updatePipelineState(db, pipeline.id, "review")

    const second = checkGate(db, pipeline.id, "approve-review", { autoApprove: false })

    if (second.approved) {
      throw new Error("Expected second gate to be pending")
    }

    const gates = getGateStatus(db, pipeline.id)

    expect(gates).toHaveLength(2)
    expect(gates.map((gate) => gate.gate_name)).toEqual(["approve-plan", "approve-review"])
    expect(gates.map((gate) => gate.status)).toEqual(["approved", "pending"])
  })
})
