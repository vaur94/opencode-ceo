import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { CeoLogger, createLogger } from "../../../src/core/logger.ts"

describe("ceo logger", () => {
  const originalConsoleLog = console.log
  const logs: Array<unknown[]> = []
  const spy = mock((...args: unknown[]) => {
    logs.push(args)
  })

  beforeEach(() => {
    logs.length = 0
    console.log = spy
  })

  afterEach(() => {
    console.log = originalConsoleLog
  })

  test("writes structured transition events with CEO prefix and context", () => {
    const logger = createLogger("session-001", "pipeline-001")

    logger.logTransition("intake", "decompose", "plan ready")

    expect(logs).toHaveLength(1)
    expect(logs[0]?.[0]).toBe("[CEO]")
    expect(logs[0]?.[1]).toMatchObject({
      event: "transition",
      session_id: "session-001",
      pipeline_id: "pipeline-001",
      from: "intake",
      to: "decompose",
      reason: "plan ready",
    })
  })

  test("writes delegation, gate, and info events with required identifiers", () => {
    const logger = new CeoLogger("session-002", "pipeline-002")

    logger.logDelegation("ceo-architect", "Create architecture proposal")
    logger.logGateEvent("approve-plan", "approved")
    logger.logInfo("Stage entered", { stage: "decompose" })

    expect(logs).toHaveLength(3)
    expect(logs[0]?.[1]).toMatchObject({
      event: "delegation",
      session_id: "session-002",
      pipeline_id: "pipeline-002",
      agent: "ceo-architect",
    })
    expect(logs[1]?.[1]).toMatchObject({
      event: "gate",
      session_id: "session-002",
      pipeline_id: "pipeline-002",
      gate_name: "approve-plan",
      status: "approved",
    })
    expect(logs[2]?.[1]).toMatchObject({
      event: "info",
      session_id: "session-002",
      pipeline_id: "pipeline-002",
      message: "Stage entered",
      stage: "decompose",
    })
  })

  test("skips pipeline_id only when it is not provided", () => {
    const logger = createLogger("session-003")

    logger.logError("request failed", new Error("temporary"))

    expect(logs).toHaveLength(1)
    expect(logs[0]?.[1]).toMatchObject({
      event: "error",
      session_id: "session-003",
    })
    expect((logs[0]?.[1] as { pipeline_id?: string }).pipeline_id).toBeUndefined()
  })
})
