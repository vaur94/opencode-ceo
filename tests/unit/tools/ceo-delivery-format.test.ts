import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import type { Database } from "bun:sqlite"

import { TOOL_PREFIX } from "../../../src/core/constants.ts"
import { createPipeline } from "../../../src/state/pipeline-store.ts"
import { createMockPluginInput, createMockToolExecutionContext, createTestDatabase } from "../../helpers/test-utils.ts"

const getDatabaseMock = mock(() => createTestDatabase())

mock.module("../../../src/state/database.js", () => ({
	getDatabase: getDatabaseMock,
}))

const { executeDeliveryFormat } = await import(
	"../../../src/tools/ceo-delivery-format.ts",
)
const { createToolDefinitions } = await import("../../../src/tools/tool-factory.ts")

describe("ceo_delivery_format", () => {
	const insertArtifact = (db: Database, pipelineId: string, stage: string, type: string, path: string, createdAt: number) => {
		db.prepare(
			"INSERT INTO artifacts (id, pipeline_id, stage, type, path, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
		).run(
			`artifact-${Math.random()}`,
			pipelineId,
			stage,
			type,
			path,
			createdAt,
		)
	}

	beforeEach(() => {
		getDatabaseMock.mockImplementation(() => createTestDatabase())
	})

	afterEach(() => {
		const db = getDatabaseMock.mock.results.at(-1)?.value as Database | undefined
		db?.close()
		getDatabaseMock.mockClear()
	})

	test("returns a formatted delivery summary for a known pipeline", async () => {
		const db = createTestDatabase()
		const pipeline = createPipeline(db, "session-1", "Ship task 23")
		db.prepare("UPDATE pipeline_runs SET created_at = ?2 WHERE id = ?1").run(
			pipeline.id,
			1700000000000,
		)
		insertArtifact(db, pipeline.id, "decompose", "plan", "/tmp/artifacts/decompose/plan.json", 1700000000100)
		insertArtifact(db, pipeline.id, "review", "review", "/tmp/artifacts/review/review.json", 1700000000200)

		getDatabaseMock.mockImplementation(() => db)

		const result = await executeDeliveryFormat(
			{
				pipeline_id: pipeline.id,
			},
			{ directory: "/repo" },
		)

		expect(result).toBe(
			`# Delivery Summary\nPipeline: ${pipeline.id}\nGoal: Ship task 23\nState: intake\nCreated: ${new Date(
				1700000000000,
			).toISOString()}\n\n## Tasks Completed\n- decompose\n- review\n\n## Files Changed\n- /tmp/artifacts/decompose/plan.json\n- /tmp/artifacts/review/review.json\n\n## PR Link\nNo PR artifact\n\n## Decisions\nNo decisions\n\n## Artifacts\n- decompose/plan: /tmp/artifacts/decompose/plan.json\n- review/review: /tmp/artifacts/review/review.json`,
		)
	})

	test("returns no-artifact summary when pipeline has no artifacts", async () => {
		const db = createTestDatabase()
		const pipeline = createPipeline(db, "session-2", "Ship task 23")
		getDatabaseMock.mockImplementation(() => db)

		const result = await executeDeliveryFormat(
			{
				pipeline_id: pipeline.id,
			},
			{ directory: "/repo" },
		)

		expect(result).toBe(
			`# Delivery Summary\nPipeline: ${pipeline.id}\nGoal: Ship task 23\nState: intake\nCreated: ${new Date(
				pipeline.created_at,
			).toISOString()}\n\n## Tasks Completed\nNo completed tasks\n\n## Files Changed\nNo files changed\n\n## PR Link\nNo PR artifact\n\n## Decisions\nNo decisions\n\n## Artifacts\nNo artifacts`,
		)
	})

	test("returns an error string for missing pipelines", async () => {
		const db = createTestDatabase()
		getDatabaseMock.mockImplementation(() => db)

		const result = await executeDeliveryFormat(
			{
				pipeline_id: "missing-pipeline",
			},
			{ directory: "/repo" },
		)

		expect(result).toBe("Error: Pipeline not found: missing-pipeline")
	})

	test("tool factory wires ceo_delivery_format to executeDeliveryFormat", async () => {
		const db = createTestDatabase()
		const pipeline = createPipeline(db, "session-3", "Ship task 23")
		db.prepare("UPDATE pipeline_runs SET created_at = ?2 WHERE id = ?1").run(
			pipeline.id,
			1700000000000,
		)
		insertArtifact(
			db,
			pipeline.id,
			"implement",
			"code-diff",
			"/tmp/artifacts/implement/code-diff.json",
			1700000000300,
		)

		getDatabaseMock.mockImplementation(() => db)

		const definitions = createToolDefinitions({
			directory: "/repo",
			worktree: "/repo",
			client: createMockPluginInput().client,
		})

		const result = await definitions[`${TOOL_PREFIX}delivery_format`]!.execute(
			{
				pipeline_id: pipeline.id,
			},
			createMockToolExecutionContext({ directory: "/repo", worktree: "/repo", sessionID: "session-3" }),
		)

		expect(result).toContain("# Delivery Summary")
		expect(result).toContain(`Pipeline: ${pipeline.id}`)
		expect(result).toContain("- implement/code-diff: /tmp/artifacts/implement/code-diff.json")
	})
})
