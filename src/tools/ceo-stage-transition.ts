import type { Database } from "bun:sqlite";

import { InvalidTransitionError } from "../core/errors.js";
import { transitionPipeline } from "../core/pipeline-fsm.js";
import type { PipelineState } from "../core/types.js";
import { getDatabase } from "../state/database.js";

export interface StageTransitionParams {
	pipeline_id: string;
	target_state: string;
	reason: string;
}

export interface StageTransitionContext {
	directory: string;
	sessionID: string;
}

function logDecision(
	db: Database,
	pipelineId: string,
	stage: string,
	decision: string,
	reasoning: string,
): void {
	db.prepare(
		`INSERT INTO decisions (
      id,
      pipeline_id,
      stage,
      decision,
      reasoning,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
	).run(
		crypto.randomUUID(),
		pipelineId,
		stage,
		decision,
		reasoning,
		Date.now(),
	);
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export async function executeStageTransition(
	params: StageTransitionParams,
	context: StageTransitionContext,
): Promise<string> {
	const db = getDatabase(context.directory);
	const { pipeline_id, target_state, reason } = params;

	try {
		const updated = transitionPipeline(
			db,
			pipeline_id,
			target_state as PipelineState,
		);
		logDecision(
			db,
			pipeline_id,
			updated.state,
			`transition:${updated.previous_state ?? "unknown"}->${updated.state}`,
			reason,
		);
		return `Pipeline ${pipeline_id} transitioned to ${updated.state}. Reason: ${reason}`;
	} catch (error) {
		const message =
			error instanceof InvalidTransitionError
				? error.message
				: `Transition failed: ${getErrorMessage(error)}`;

		logDecision(
			db,
			pipeline_id,
			target_state,
			`transition_error:${target_state}`,
			`${reason} | ${message}`,
		);
		return `Error: ${message}`;
	}
}
