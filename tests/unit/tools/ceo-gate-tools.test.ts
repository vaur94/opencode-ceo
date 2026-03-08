import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { TOOL_PREFIX } from "../../../src/core/constants.ts";
import { createPipeline, getPipeline } from "../../../src/state/pipeline-store.ts";
import { createTestDatabase } from "../../helpers/test-utils.ts";

const getDatabaseMock = mock(() => createTestDatabase());

mock.module("../../../src/state/database.js", () => ({
	getDatabase: getDatabaseMock,
}));

const { executeGateRun, executeGateStatus } = await import(
	"../../../src/tools/ceo-gate-tools.ts"
);
const { createToolDefinitions } = await import(
	"../../../src/tools/tool-factory.ts"
);

describe("ceo_gate_tools", () => {
	beforeEach(() => {
		getDatabaseMock.mockImplementation(() => createTestDatabase());
	});

	afterEach(() => {
		const db = getDatabaseMock.mock.results.at(-1)?.value;
		db?.close(false);
		getDatabaseMock.mockClear();
	});

	test("auto-approve gate returns an approved message without creating a gate", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-1", "Ship task 18");

		getDatabaseMock.mockImplementation(() => db);

		const result = await executeGateRun(
			{
				pipeline_id: pipeline.id,
				gate_name: "approve-plan",
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toBe('Gate "approve-plan" approved. Pipeline continues.');
		expect(
			db.query("SELECT COUNT(*) AS count FROM gates").get() as { count: number },
		).toEqual({ count: 0 });
	});

	test("manual gate creates a pending gate and returns its id", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-2", "Ship task 18");

		db.prepare("UPDATE pipeline_runs SET metadata = ?2 WHERE id = ?1").run(
			pipeline.id,
			JSON.stringify({
				gates: {
					"approve-review": { autoApprove: false },
				},
				autonomy: "gated",
			}),
		);
		getDatabaseMock.mockImplementation(() => db);

		const result = await executeGateRun(
			{
				pipeline_id: pipeline.id,
				gate_name: "approve-review",
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toContain('Gate "approve-review" pending approval.');
		expect(result).toContain("Gate ID:");
		expect(result).toContain("Gate created, awaiting approval");
		expect(getPipeline(db, pipeline.id)?.state).toBe("blocked");
		expect(
			db
				.query(
					"SELECT gate_name, status FROM gates WHERE pipeline_id = ?1 ORDER BY requested_at ASC, id ASC",
				)
				.all(pipeline.id),
		).toEqual([{ gate_name: "approve-review", status: "pending" }]);
	});

	test("gate status on a pipeline with no gates returns the empty message", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-3", "Ship task 18");

		getDatabaseMock.mockImplementation(() => db);

		const result = await executeGateStatus(
			{
				pipeline_id: pipeline.id,
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toBe("No gates configured for this pipeline.");
	});

	test("gate status returns a JSON list when gates exist", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-4", "Ship task 18");

		db.prepare(
			`INSERT INTO gates (
				id,
				pipeline_id,
				gate_name,
				status,
				requested_at,
				resolved_at,
				resolved_by
			) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
		).run(
			"gate-1",
			pipeline.id,
			"approve-delivery",
			"pending",
			123,
			null,
			null,
		);
		getDatabaseMock.mockImplementation(() => db);

		const result = await executeGateStatus(
			{
				pipeline_id: pipeline.id,
			},
			{
				directory: "/repo",
			},
		);

		expect(JSON.parse(result)).toEqual([
			{
				id: "gate-1",
				pipeline_id: pipeline.id,
				gate_name: "approve-delivery",
				status: "pending",
				requested_at: 123,
				resolved_at: null,
				resolved_by: null,
			},
		]);
	});

	test("tool factory wires both gate tools to the real implementations", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-5", "Ship task 18");

		getDatabaseMock.mockImplementation(() => db);

		const definitions = createToolDefinitions({
			directory: "/repo",
			worktree: "/repo",
		});

		const runResult = await definitions[`${TOOL_PREFIX}gate_run`].execute(
			{
				pipeline_id: pipeline.id,
				gate_name: "approve-plan",
			},
			{
				directory: "/repo",
				sessionID: "session-5",
			},
		);
		const statusResult = await definitions[`${TOOL_PREFIX}gate_status`].execute(
			{
				pipeline_id: pipeline.id,
			},
			{
				directory: "/repo",
				sessionID: "session-5",
			},
		);

		expect(runResult).toBe('Gate "approve-plan" approved. Pipeline continues.');
		expect(statusResult).toBe("No gates configured for this pipeline.");
	});
});
