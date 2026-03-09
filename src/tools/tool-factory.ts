import type { PluginInput } from "@opencode-ai/plugin";
import type { ToolContext as PluginToolContext } from "@opencode-ai/plugin/tool";

import { TOOL_PREFIX } from "@core/constants";
import { type ToolDefinition, tool } from "@opencode-ai/plugin/tool";
import {
	executeArtifactRead,
	executeArtifactWrite,
} from "./ceo-artifact-tools.js";
import {
	executeCeoContextPack,
	executeCeoContextRestore,
} from "./ceo-context-tools.js";
import { executeDecisionLog } from "./ceo-decision-log.js";
import { executeCeoDelegate } from "./ceo-delegate.js";
import { executeDeliveryFormat } from "./ceo-delivery-format.js";
import { executeGateRun, executeGateStatus } from "./ceo-gate-tools.js";
import { executeBranchPrepare, executePrPrepare } from "./ceo-git-tools.js";
import { executeRepoFingerprint, executeStackDetect } from "./ceo-repo-tools.js";
import { executeStageTransition } from "./ceo-stage-transition.js";

const z = tool.schema;

export interface ToolFactoryDeps {
	directory: string;
	worktree: string;
	client: PluginInput["client"];
}

type ToolBuilder = (deps: ToolFactoryDeps) => ToolDefinition;


function toDelegateContext(context: PluginToolContext, deps: ToolFactoryDeps) {
	return {
		client: deps.client,
		directory: context.directory,
		sessionID: context.sessionID,
	};
}

function createToolBuilders(deps: ToolFactoryDeps): Record<string, ToolBuilder> {
	return {
	[`${TOOL_PREFIX}delegate`]: () =>
		tool({
			description: "Delegate a task to a CEO sub-agent.",
			args: {
				agent: z.string(),
				prompt: z.string(),
				timeout: z.number().optional(),
			},
			async execute(args, context) {
				return executeCeoDelegate(args, toDelegateContext(context, deps));
			},
		}),
	[`${TOOL_PREFIX}stage_transition`]: () =>
		tool({
			description: "Transition a pipeline to a target state.",
			args: {
				pipeline_id: z.string(),
				target_state: z.string(),
				reason: z.string(),
			},
			async execute(args, context) {
				return executeStageTransition(args, context);
			},
		}),
	[`${TOOL_PREFIX}gate_run`]: () =>
		tool({
			description: "Run a named gate for a pipeline.",
			args: {
				pipeline_id: z.string(),
				gate_name: z.string(),
			},
			async execute(args, context) {
				return executeGateRun(args, context);
			},
		}),
	[`${TOOL_PREFIX}gate_status`]: () =>
		tool({
			description: "Read the current gate status for a pipeline.",
			args: {
				pipeline_id: z.string(),
			},
			async execute(args, context) {
				return executeGateStatus(args, context);
			},
		}),
	[`${TOOL_PREFIX}artifact_write`]: () =>
		tool({
			description: "Write an artifact for a pipeline stage.",
			args: {
				pipeline_id: z.string(),
				stage: z.string(),
				type: z.string(),
				data: z.record(z.string(), z.unknown()),
			},
			async execute(args, context) {
				return executeArtifactWrite(args, context);
			},
		}),
	[`${TOOL_PREFIX}artifact_read`]: () =>
		tool({
			description: "Read an artifact for a pipeline stage.",
			args: {
				pipeline_id: z.string(),
				stage: z.string(),
				type: z.string(),
			},
			async execute(args, context) {
				return executeArtifactRead(args, context);
			},
		}),
	[`${TOOL_PREFIX}decision_log`]: () =>
		tool({
			description: "Record a decision for a pipeline stage.",
			args: {
				pipeline_id: z.string(),
				stage: z.string(),
				decision: z.string(),
				reasoning: z.string().optional(),
			},
			async execute(args, context) {
				return executeDecisionLog(args, context);
			},
		}),
	[`${TOOL_PREFIX}branch_prepare`]: () =>
		tool({
			description: "Prepare a branch name for a pipeline.",
			args: {
				pipeline_id: z.string(),
				slug: z.string(),
			},
			async execute(args, context) {
				return executeBranchPrepare(args, context);
			},
		}),
	[`${TOOL_PREFIX}pr_prepare`]: () =>
		tool({
			description: "Prepare a pull request payload for a pipeline.",
			args: {
				pipeline_id: z.string(),
				title: z.string(),
				body: z.string(),
			},
			async execute(args, context) {
				return executePrPrepare(args, context);
			},
		}),
	[`${TOOL_PREFIX}repo_fingerprint`]: () =>
		tool({
			description: "Generate a repository fingerprint.",
			args: {
				directory: z.string(),
			},
			async execute(args, context) {
				return executeRepoFingerprint(args, context);
			},
		}),
	[`${TOOL_PREFIX}stack_detect`]: () =>
		tool({
			description: "Detect the project stack for a directory.",
			args: {
				directory: z.string(),
			},
			async execute(args, context) {
				return executeStackDetect(args, context);
			},
		}),
	[`${TOOL_PREFIX}delivery_format`]: () =>
		tool({
			description: "Format delivery output for a pipeline.",
			args: {
				pipeline_id: z.string(),
				format: z.string().optional(),
			},
			async execute(args, context) {
				return executeDeliveryFormat(args, context)
			},
		}),
	[`${TOOL_PREFIX}context_pack`]: () =>
		tool({
			description: "Pack context for a pipeline handoff.",
			args: {
				pipeline_id: z.string(),
			},
			async execute(args, context) {
				return executeCeoContextPack(args, context);
			},
		}),
	[`${TOOL_PREFIX}context_restore`]: () =>
		tool({
			description: "Restore packed context into a session.",
			args: {
				session_id: z.string(),
			},
			async execute(args, context) {
				return executeCeoContextRestore(args, context);
			},
		}),
  };
}

export const CEO_TOOL_NAMES = Object.freeze([
	`${TOOL_PREFIX}delegate`,
	`${TOOL_PREFIX}stage_transition`,
	`${TOOL_PREFIX}gate_run`,
	`${TOOL_PREFIX}gate_status`,
	`${TOOL_PREFIX}artifact_write`,
	`${TOOL_PREFIX}artifact_read`,
	`${TOOL_PREFIX}decision_log`,
	`${TOOL_PREFIX}branch_prepare`,
	`${TOOL_PREFIX}pr_prepare`,
	`${TOOL_PREFIX}repo_fingerprint`,
	`${TOOL_PREFIX}stack_detect`,
	`${TOOL_PREFIX}delivery_format`,
	`${TOOL_PREFIX}context_pack`,
	`${TOOL_PREFIX}context_restore`,
]);

export function createToolDefinitions(
	deps: ToolFactoryDeps,
): Record<string, ToolDefinition> {
	const toolBuilders = createToolBuilders(deps);

	return Object.fromEntries(
		Object.entries(toolBuilders).map(([name, buildTool]) => [
			name,
			buildTool(deps),
		]),
	);
}
