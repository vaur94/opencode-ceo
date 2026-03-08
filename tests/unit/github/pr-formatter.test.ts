import { describe, expect, test } from "bun:test";

import {
	type DecisionEntry,
	formatPRBody,
} from "../../../src/github/pr-formatter.ts";
import type { ArtifactEntry } from "../../../src/state/artifact-types.ts";
import type { PipelineRun } from "../../../src/state/types.ts";

describe("pr-formatter", () => {
	test("formatPRBody renders markdown with empty artifacts and decisions", () => {
		const pipeline: PipelineRun = {
			id: "pipeline-123",
			session_id: "session-123",
			state: "implement",
			previous_state: "decompose",
			goal: "Ship the formatter",
			created_at: 1710000000000,
			updated_at: 1710000005000,
			metadata: null,
		};

		expect(formatPRBody(pipeline, [], [])).toBe(`## 🎯 Goal
Ship the formatter

## 📊 Pipeline Summary
- **Status**: implement
- **Pipeline ID**: pipeline-123
- **Started**: 1710000000000

## 📦 Artifacts
- None

## 🧠 Decisions Made
- None`);
	});

	test("formatPRBody renders artifact and decision details", () => {
		const pipeline: PipelineRun = {
			id: "pipeline-456",
			session_id: "session-456",
			state: "review",
			previous_state: "implement",
			goal: "Prepare a clean pull request body",
			created_at: 1710000010000,
			updated_at: 1710000015000,
			metadata: '{"source":"test"}',
		};

		const artifacts: ArtifactEntry[] = [
			{
				id: "artifact-1",
				pipeline_id: "pipeline-456",
				stage: "implement",
				type: "code-diff",
				path: "artifacts/diff.patch",
				created_at: 1710000011000,
			},
			{
				id: "artifact-2",
				pipeline_id: "pipeline-456",
				stage: "test",
				type: "test-result",
				path: "artifacts/test.txt",
				created_at: 1710000012000,
			},
		];

		const decisions: DecisionEntry[] = [
			{
				id: "decision-1",
				pipeline_id: "pipeline-456",
				stage: "implement",
				decision: "Use a pure formatter function",
				reasoning: "It keeps PR generation deterministic and easy to test.",
				created_at: "2026-03-09T10:00:00.000Z",
			},
			{
				id: "decision-2",
				pipeline_id: "pipeline-456",
				stage: "review",
				decision: "Preserve explicit empty states",
				reasoning:
					"Reviewers should see when no artifacts or decisions were produced.",
				created_at: "2026-03-09T10:05:00.000Z",
			},
		];

		expect(formatPRBody(pipeline, artifacts, decisions)).toBe(`## 🎯 Goal
Prepare a clean pull request body

## 📊 Pipeline Summary
- **Status**: review
- **Pipeline ID**: pipeline-456
- **Started**: 1710000010000

## 📦 Artifacts
- **code-diff** (implement)
- **test-result** (test)

## 🧠 Decisions Made
- **implement**: Use a pure formatter function
  - Reasoning: It keeps PR generation deterministic and easy to test.
- **review**: Preserve explicit empty states
  - Reasoning: Reviewers should see when no artifacts or decisions were produced.`);
	});
});
