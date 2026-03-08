import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
	createPipeline,
	getPipelineBySession,
	listActivePipelines,
} from "../../src/state/pipeline-store.ts";
import {
	createStageExecution,
	getStageHistory,
} from "../../src/state/stage-store.ts";
import { createTestDatabase } from "../helpers/test-utils.ts";

describe("state isolation", () => {
	let db: Database;

	beforeEach(() => {
		db = createTestDatabase();
	});

	afterEach(() => {
		db.close();
	});

	test("session A pipeline invisible to session B", () => {
		const sessionAPipeline = createPipeline(db, "session-a", "Alpha goal");
		const sessionBPipeline = createPipeline(db, "session-b", "Beta goal");

		expect(getPipelineBySession(db, "session-a")).toEqual(sessionAPipeline);
		expect(getPipelineBySession(db, "session-b")).toEqual(sessionBPipeline);

		const activePipelines = listActivePipelines(db);
		const sessionAPipelineIds = activePipelines
			.filter((pipeline) => pipeline.session_id === "session-a")
			.map((pipeline) => pipeline.id);

		expect(sessionAPipelineIds).toEqual([sessionAPipeline.id]);
		expect(sessionAPipelineIds).not.toContain(sessionBPipeline.id);
	});

	test("concurrent writes don't corrupt", async () => {
		const createdPipelines = await Promise.all(
			Array.from({ length: 5 }, (_, index) =>
				Promise.resolve().then(() =>
					createPipeline(db, `session-${index + 1}`, `Goal ${index + 1}`),
				),
			),
		);

		expect(new Set(createdPipelines.map((pipeline) => pipeline.id)).size).toBe(
			5,
		);

		for (const pipeline of createdPipelines) {
			expect(getPipelineBySession(db, pipeline.session_id)).toEqual(pipeline);
		}

		expect(
			listActivePipelines(db)
				.map((pipeline) => pipeline.id)
				.sort(),
		).toEqual(createdPipelines.map((pipeline) => pipeline.id).sort());
	});

	test("stage history isolated by pipeline", () => {
		const firstPipeline = createPipeline(db, "session-a", "First goal");
		const secondPipeline = createPipeline(db, "session-b", "Second goal");
		const firstStages = [
			createStageExecution(db, firstPipeline.id, "implement"),
			createStageExecution(db, firstPipeline.id, "review"),
		];
		const secondStages = [
			createStageExecution(db, secondPipeline.id, "test"),
			createStageExecution(db, secondPipeline.id, "deliver"),
		];

		const firstHistory = getStageHistory(db, firstPipeline.id);
		const secondHistory = getStageHistory(db, secondPipeline.id);

		// Sort by stage name to avoid same-millisecond ordering flakiness
		expect(firstHistory.map((s) => s.stage).sort()).toEqual(
			firstStages.map((s) => s.stage).sort(),
		);
		expect(firstHistory.map((s) => s.id).sort()).toEqual(
			firstStages.map((s) => s.id).sort(),
		);
		expect(secondHistory.map((s) => s.stage).sort()).toEqual(
			secondStages.map((s) => s.stage).sort(),
		);
		expect(secondHistory.map((s) => s.id).sort()).toEqual(
			secondStages.map((s) => s.id).sort(),
		);
		expect(
			firstHistory.map((stage) => stage.pipeline_id),
		).toEqual([firstPipeline.id, firstPipeline.id]);
	});
});
