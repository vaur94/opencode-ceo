import { checkGate, getGateStatus } from "../core/gate-system.js";
import type { GateConfig, PipelineConfig } from "../core/types.js";
import { getDatabase } from "../state/database.js";
import { getPipeline } from "../state/pipeline-store.js";

export interface GateRunParams {
	pipeline_id: string;
	gate_name: string;
}

export interface GateStatusParams {
	pipeline_id: string;
}

export interface GateToolContext {
	directory: string;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function parsePipelineConfig(metadata: string | null): PipelineConfig | null {
	if (!metadata) {
		return null;
	}

	try {
		const parsed = JSON.parse(metadata) as
			| PipelineConfig
			| { config?: PipelineConfig };

		if (parsed && typeof parsed === "object" && "config" in parsed) {
			return parsed.config ?? null;
		}

		return parsed ?? null;
	} catch {
		return null;
	}
}

function getGateConfig(directory: string, pipelineId: string, gateName: string): GateConfig {
	const db = getDatabase(directory);
	const pipeline = getPipeline(db, pipelineId);
	const pipelineConfig = parsePipelineConfig(pipeline?.metadata ?? null);

	return pipelineConfig?.gates?.[gateName] ?? { autoApprove: true };
}

export async function executeGateRun(
	params: GateRunParams,
	context: GateToolContext,
): Promise<string> {
	const db = getDatabase(context.directory);

	try {
		const config = getGateConfig(
			context.directory,
			params.pipeline_id,
			params.gate_name,
		);
		const result = checkGate(db, params.pipeline_id, params.gate_name, config);

		if (result.approved) {
			return `Gate "${params.gate_name}" approved. Pipeline continues.`;
		}

		return `Gate "${params.gate_name}" pending approval. Gate ID: ${result.gateId}. Reason: ${result.reason}`;
	} catch (error) {
		return `Error: ${getErrorMessage(error)}`;
	}
}

export async function executeGateStatus(
	params: GateStatusParams,
	context: GateToolContext,
): Promise<string> {
	const db = getDatabase(context.directory);

	try {
		const gates = getGateStatus(db, params.pipeline_id);

		if (gates.length === 0) {
			return "No gates configured for this pipeline.";
		}

		return JSON.stringify(gates, null, 2);
	} catch (error) {
		return `Error: ${getErrorMessage(error)}`;
	}
}
