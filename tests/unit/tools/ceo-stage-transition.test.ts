import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { TOOL_PREFIX } from "../../../src/core/constants.ts";
import {
	createPipeline,
	getPipeline,
} from "../../../src/state/pipeline-store.ts";
import {
	createMockPluginInput,
	createMockToolExecutionContext,
	createTestDatabase,
} from "../../helpers/test-utils.ts";

const getDatabaseMock = mock(() => createTestDatabase());

mock.module("../../../src/state/database.js", () => ({
	getDatabase: getDatabaseMock,
}));

const { executeStageTransition } = await import(
	"../../../src/tools/ceo-stage-transition.ts"
);
const { createToolDefinitions } = await import(
	"../../../src/tools/tool-factory.ts"
);

type DecisionRow = {
	pipeline_id: string;
	stage: string;
	decision: string;
	reasoning: string | null;
};

function getDecisionRows() {
	return (
		((getDatabaseMock.mock.results.at(-1)?.value as Database | undefined)
			?.query<DecisionRow, []>(
				`SELECT pipeline_id, stage, decision, reasoning
       FROM decisions
				 ORDER BY created_at ASC, id ASC`,
			)
			.all() ?? [])
	);
}

describe("ceo_stage_transition", () => {
	beforeEach(() => {
		getDatabaseMock.mockImplementation(() => createTestDatabase());
	});

	afterEach(() => {
		const db = getDatabaseMock.mock.results.at(-1)?.value as Database | undefined;
		db?.close();
		getDatabaseMock.mockClear();
	});

	test("returns a success string and updates pipeline state", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-1", "Ship task 17");

		getDatabaseMock.mockImplementation(() => db);

		const result = await executeStageTransition(
			{
				pipeline_id: pipeline.id,
				target_state: "decompose",
				reason: "Ready for planning",
			},
			{
				directory: "/repo",
				sessionID: "session-1",
			},
		);

		expect(result).toBe(
			`Pipeline ${pipeline.id} transitioned to decompose. Reason: Ready for planning`,
		);
		expect(getPipeline(db, pipeline.id)?.state).toBe("decompose");
		expect(getDecisionRows()).toEqual([
			{
				pipeline_id: pipeline.id,
				stage: "decompose",
				decision: "transition:intake->decompose",
				reasoning: "Ready for planning",
			},
		]);
	});

	test("returns an error string for invalid transitions without throwing", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-2", "Ship task 17");

		getDatabaseMock.mockImplementation(() => db);

		const result = await executeStageTransition(
			{
				pipeline_id: pipeline.id,
				target_state: "review",
				reason: "Skipping ahead",
			},
			{
				directory: "/repo",
				sessionID: "session-2",
			},
		);

		expect(result).toBe("Error: Invalid pipeline transition: intake -> review");
		expect(getPipeline(db, pipeline.id)?.state).toBe("intake");
		expect(getDecisionRows()).toEqual([
			{
				pipeline_id: pipeline.id,
				stage: "review",
				decision: "transition_error:review",
				reasoning:
					"Skipping ahead | Invalid pipeline transition: intake -> review",
			},
		]);
	});

	test("returns an error string when the pipeline is missing", async () => {
		const db = createTestDatabase();

		getDatabaseMock.mockImplementation(() => db);

		const result = await executeStageTransition(
			{
				pipeline_id: "missing-pipeline",
				target_state: "decompose",
				reason: "Trying to recover",
			},
			{
				directory: "/repo",
				sessionID: "session-3",
			},
		);

		expect(result).toBe(
			"Error: Transition failed: Pipeline not found: missing-pipeline",
		);
		expect(getDecisionRows()).toEqual([
			{
				pipeline_id: "missing-pipeline",
				stage: "decompose",
				decision: "transition_error:decompose",
				reasoning:
					"Trying to recover | Transition failed: Pipeline not found: missing-pipeline",
			},
		]);
	});

	test("tool factory wires ceo_stage_transition to the real implementation", async () => {
		const db = createTestDatabase();
		const pipeline = createPipeline(db, "session-4", "Ship task 17");

		getDatabaseMock.mockImplementation(() => db);

		const definitions = createToolDefinitions({
			directory: "/repo",
			worktree: "/repo",
			client: createMockPluginInput().client,
		});

		const result = await definitions[`${TOOL_PREFIX}stage_transition`]!.execute(
			{
				pipeline_id: pipeline.id,
				target_state: "decompose",
				reason: "Factory path",
			},
			createMockToolExecutionContext({ directory: "/repo", worktree: "/repo", sessionID: "session-4" }),
		);

		expect(result).toBe(
			`Pipeline ${pipeline.id} transitioned to decompose. Reason: Factory path`,
		);
		expect(getPipeline(db, pipeline.id)?.state).toBe("decompose");
	});
});
