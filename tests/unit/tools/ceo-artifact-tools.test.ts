import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { Database } from "bun:sqlite"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { TOOL_PREFIX } from "../../../src/core/constants.ts"
import { initializeDatabase } from "../../../src/state/database.js"

const getDatabaseMock = mock((): Database => {
	throw new Error("Database mock has not been initialized")
})

mock.module("../../../src/state/database.js", () => ({
	getDatabase: getDatabaseMock,
}))

const { executeArtifactRead, executeArtifactWrite } = await import(
	"../../../src/tools/ceo-artifact-tools.ts"
)
const { createToolDefinitions } = await import("../../../src/tools/tool-factory.ts")

type ArtifactRow = {
	pipeline_id: string
	stage: string
	type: string
	path: string
}

async function createFixtureDatabase() {
	const directory = await mkdtemp(join(tmpdir(), "ceo-artifact-tools-"))
	const stateDirectory = join(directory, ".ceo")
	mkdirSync(stateDirectory, { recursive: true })
	const databasePath = join(stateDirectory, "state.db")
	const db = new Database(databasePath, {
		create: true,
		strict: true,
	})
	initializeDatabase(db)

	return { db, directory }
}

describe("ceo_artifact_tools", () => {
	let fixture: { db: Database; directory: string } | null = null

	function getFixture() {
		if (!fixture) {
			throw new Error("Test database fixture was not initialized")
		}

		return fixture
	}

	beforeEach(async () => {
		fixture = await createFixtureDatabase()
		getDatabaseMock.mockImplementation(() => getFixture().db)
	})

	afterEach(async () => {
		fixture?.db.close(false)
		if (fixture?.directory) {
			await rm(fixture.directory, { recursive: true, force: true })
		}
		fixture = null
		getDatabaseMock.mockClear()
	})

	test("writes an artifact file and persists db metadata", async () => {
		const { directory, db } = getFixture()
		const expectedPath = join(directory, ".ceo", "artifacts", "pipe-1", "decompose", "plan.json")
		const artifactData = {
			goal: "Ship task 19",
			numeric: 123,
			nested: { key: "value" },
		}

		const result = await executeArtifactWrite(
			{
				pipeline_id: "pipe-1",
				stage: "decompose",
				type: "plan",
				data: artifactData,
			},
			{ directory },
		)

		expect(result).toBe(`Artifact written to ${expectedPath}`)
		expect(readFileSync(expectedPath, "utf8")).toBe(JSON.stringify(artifactData))
		expect(existsSync(expectedPath)).toBeTrue()

		const rows = db
			.prepare<ArtifactRow, []>(
				"SELECT pipeline_id, stage, type, path FROM artifacts WHERE pipeline_id = ?1",
			)
			.all("pipe-1")

		expect(rows).toEqual([
			{
				pipeline_id: "pipe-1",
				stage: "decompose",
				type: "plan",
				path: expectedPath,
			},
		])
	})

	test("reads an artifact as pretty JSON string", async () => {
		const { directory } = getFixture()
		const artifactData = { result: "success", passed: true }

		await executeArtifactWrite(
			{
				pipeline_id: "pipe-2",
				stage: "review",
				type: "review",
				data: artifactData,
			},
			{ directory },
		)

		const result = await executeArtifactRead(
			{
				pipeline_id: "pipe-2",
				stage: "review",
				type: "review",
			},
			{ directory },
		)

		expect(result).toBe(JSON.stringify(artifactData, null, 2))
	})

	test("returns not found message for missing artifacts", async () => {
		const { directory } = getFixture()
		const result = await executeArtifactRead(
			{
				pipeline_id: "pipe-3",
				stage: "test",
				type: "test-result",
			},
			{ directory },
		)

		expect(result).toBe("Artifact not found")
	})

		test("tool factory wires artifact tools to real implementations", async () => {
		const { directory } = getFixture()
		const definitions = createToolDefinitions({
			directory,
			worktree: directory,
		})

		await definitions[`${TOOL_PREFIX}artifact_write`].execute(
			{
				pipeline_id: "pipe-4",
				stage: "test",
				type: "test-result",
				data: { ok: true },
			},
			{
				directory,
				sessionID: "session-4",
			},
		)

		const result = await definitions[`${TOOL_PREFIX}artifact_read`].execute(
			{
				pipeline_id: "pipe-4",
				stage: "test",
				type: "test-result",
			},
			{ directory, sessionID: "session-4" },
		)

		expect(result).toBe(JSON.stringify({ ok: true }, null, 2))
	})
})
