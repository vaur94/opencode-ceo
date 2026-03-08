import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { TOOL_PREFIX } from "../../../src/core/constants.ts"
import { createPipeline } from "../../../src/state/pipeline-store.ts"
import { createTestDatabase } from "../../helpers/test-utils.ts"

const getDatabaseMock = mock(() => createTestDatabase())

mock.module("../../../src/state/database.js", () => ({
	getDatabase: getDatabaseMock,
}))

const { executeDecisionLog } = await import("../../../src/tools/ceo-decision-log.ts")
const { createToolDefinitions } = await import("../../../src/tools/tool-factory.ts")

type DecisionRow = {
	pipeline_id: string
	stage: string
	decision: string
	reasoning: string | null
}

describe("ceo_decision_log", () => {
	beforeEach(() => {
		getDatabaseMock.mockImplementation(() => createTestDatabase())
	})

	afterEach(() => {
		const db = getDatabaseMock.mock.results.at(-1)?.value
		db?.close(false)
		getDatabaseMock.mockClear()
	})

	test("writes a decision row into the decisions table", async () => {
		const db = createTestDatabase()
		const pipeline = createPipeline(db, "session-1", "Ship task 20")

		getDatabaseMock.mockImplementation(() => db)

		const result = await executeDecisionLog(
			{
				pipeline_id: pipeline.id,
				stage: "decompose",
				decision: "accept",
				reasoning: "Clearer scope",
			},
			{ directory: "/repo" },
		)

		const rows = db
			.query<DecisionRow, [string]>(
				"SELECT pipeline_id, stage, decision, reasoning FROM decisions WHERE pipeline_id = ?1 ORDER BY created_at ASC, id ASC",
			)
			.all(pipeline.id)

		expect(result).toBe("Decision logged: accept")
		expect(rows).toEqual([
			{
				pipeline_id: pipeline.id,
				stage: "decompose",
				decision: "accept",
				reasoning: "Clearer scope",
			},
		])
	})

	test("supports querying decisions by pipeline_id", async () => {
		const db = createTestDatabase()
		const first = createPipeline(db, "session-2", "Ship task 20")
		const second = createPipeline(db, "session-3", "Ship another task")

		getDatabaseMock.mockImplementation(() => db)

		await executeDecisionLog(
			{
				pipeline_id: first.id,
				stage: "decompose",
				decision: "accept",
			},
			{ directory: "/repo" },
		)

		await executeDecisionLog(
			{
				pipeline_id: second.id,
				stage: "review",
				decision: "reject",
			},
			{ directory: "/repo" },
		)

		const rows = db
			.query<DecisionRow, [string]>(
				"SELECT pipeline_id, stage, decision, reasoning FROM decisions WHERE pipeline_id = ?1 ORDER BY created_at ASC, id ASC",
			)
			.all(first.id)

		expect(rows).toEqual([
			{
				pipeline_id: first.id,
				stage: "decompose",
				decision: "accept",
				reasoning: null,
			},
		])
	})

	test("tool factory wires the decision_log tool to executeDecisionLog", async () => {
		const db = createTestDatabase()
		const pipeline = createPipeline(db, "session-4", "Ship task 20")
		const definitions = createToolDefinitions({
			directory: "/repo",
			worktree: "/repo",
		})

		getDatabaseMock.mockImplementation(() => db)

		const result = await definitions[`${TOOL_PREFIX}decision_log`].execute(
			{
				pipeline_id: pipeline.id,
				stage: "test",
				decision: "hold",
			},
			{ directory: "/repo", sessionID: "session-4" },
		)

		expect(result).toBe("Decision logged: hold")
		expect(
			db
				.query<DecisionRow, [string]>(
					"SELECT pipeline_id, stage, decision, reasoning FROM decisions WHERE pipeline_id = ?1 ORDER BY created_at ASC, id ASC",
				)
				.all(pipeline.id),
		).toEqual([
			{
				pipeline_id: pipeline.id,
				stage: "test",
				decision: "hold",
				reasoning: null,
			},
		])
	})
})
