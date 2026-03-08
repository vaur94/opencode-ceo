import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import type { Database } from "bun:sqlite"

import { TERMINAL_STATES, VALID_TRANSITIONS } from "../../../src/core/constants.ts"
import { InvalidTransitionError } from "../../../src/core/errors.ts"
import { createNewPipeline, resumePipeline } from "../../../src/core/pipeline-manager.ts"
import { transitionPipeline, validateTransition } from "../../../src/core/pipeline-fsm.ts"
import type { PipelineState } from "../../../src/core/types.ts"
import { getPipeline, updatePipelineState } from "../../../src/state/pipeline-store.ts"
import { createStageExecution, getStageHistory } from "../../../src/state/stage-store.ts"
import { createTestDatabase } from "../../helpers/test-utils.ts"

const PIPELINE_STATES = Object.keys(VALID_TRANSITIONS) as PipelineState[]
const VALID_TRANSITION_CASES = Object.entries(VALID_TRANSITIONS).flatMap(([from, targets]) =>
  targets.map((to) => [from as PipelineState, to] as const),
)
const INVALID_TRANSITION_CASES = PIPELINE_STATES.flatMap((from) =>
  PIPELINE_STATES.filter((to) => !VALID_TRANSITIONS[from].includes(to)).map((to) => [from, to] as const),
)

describe("pipeline FSM", () => {
  let db: Database

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  for (const [from, to] of VALID_TRANSITION_CASES) {
    test(`validateTransition accepts ${from} -> ${to}`, () => {
      expect(validateTransition(from, to)).toBeTrue()
    })

    test(`transitionPipeline executes ${from} -> ${to}`, () => {
      const pipeline = createNewPipeline(db, `session-${from}-${to}`, `Transition ${from} to ${to}`)

      if (from !== "intake") {
        updatePipelineState(db, pipeline.id, from)
      }

      const transitioned = transitionPipeline(db, pipeline.id, to)
      const stored = getPipeline(db, pipeline.id)
      const history = getStageHistory(db, pipeline.id)

      expect(transitioned.state).toBe(to)
      expect(transitioned.previous_state).toBe(from)
      expect(stored).toEqual(transitioned)
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        pipeline_id: pipeline.id,
        stage: to,
        status: "running",
      })
    })
  }

  for (const [from, to] of INVALID_TRANSITION_CASES) {
    test(`validateTransition rejects ${from} -> ${to}`, () => {
      expect(validateTransition(from, to)).toBeFalse()
    })

    test(`transitionPipeline rejects invalid ${from} -> ${to}`, () => {
      const pipeline = createNewPipeline(db, `invalid-${from}-${to}`, `Reject ${from} to ${to}`)

      if (from !== "intake") {
        updatePipelineState(db, pipeline.id, from)
      }

      expect(() => transitionPipeline(db, pipeline.id, to)).toThrow(InvalidTransitionError)
      expect(getPipeline(db, pipeline.id)?.state).toBe(from)
      expect(getStageHistory(db, pipeline.id)).toEqual([])
    })
  }

  test("terminal states reject every outbound transition", () => {
    for (const from of TERMINAL_STATES) {
      for (const to of PIPELINE_STATES) {
        expect(validateTransition(from, to)).toBeFalse()
      }
    }
  })

  test("backward skip transitions throw InvalidTransitionError", () => {
    const pipeline = createNewPipeline(db, "session-backward-skip", "Catch backward skip")
    updatePipelineState(db, pipeline.id, "test")

    expect(() => transitionPipeline(db, pipeline.id, "decompose")).toThrow(InvalidTransitionError)
    expect(getPipeline(db, pipeline.id)?.state).toBe("test")
  })

  test("throws when the pipeline is missing", () => {
    expect(() => transitionPipeline(db, "missing-pipeline", "decompose")).toThrow(
      "Pipeline not found: missing-pipeline",
    )
    expect(() => resumePipeline(db, "missing-pipeline")).toThrow("Pipeline not found: missing-pipeline")
  })

  test("resumePipeline returns an interrupted pipeline without changing state", () => {
    const pipeline = createNewPipeline(db, "session-interrupted", "Resume interrupted pipeline")

    createStageExecution(db, pipeline.id, "decompose")
    createStageExecution(db, pipeline.id, "implement")
    updatePipelineState(db, pipeline.id, "interrupted")

    const resumed = resumePipeline(db, pipeline.id)

    expect(resumed.state).toBe("interrupted")
    expect(resumed.previous_state).toBe("intake")
    expect(getStageHistory(db, pipeline.id)).toHaveLength(2)
  })

  test("resumePipeline returns non-interrupted pipelines unchanged", () => {
    const pipeline = createNewPipeline(db, "session-active", "Leave active pipeline alone")
    updatePipelineState(db, pipeline.id, "implement")
    const stored = getPipeline(db, pipeline.id)

    if (!stored) {
      throw new Error("Expected stored pipeline to exist")
    }

    expect(resumePipeline(db, pipeline.id)).toEqual(stored)
  })
})
