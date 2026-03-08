import { TOOL_PREFIX } from "@core/constants";
import { type ToolDefinition, tool } from "@opencode-ai/plugin/tool";
import {
	executeArtifactRead,
	executeArtifactWrite,
} from "./ceo-artifact-tools.js";
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
}

type ToolBuilder = (deps: ToolFactoryDeps) => ToolDefinition;
type ToolArgs = Parameters<typeof tool>[0]["args"];

const STUB_SUFFIX = ": not yet implemented";

function createStubTool(
	name: string,
	description: string,
	args: ToolArgs,
): ToolDefinition {
	return tool({
		description,
		args,
		async execute() {
			return `[STUB] ${name}${STUB_SUFFIX}`;
		},
	});
}

const TOOL_BUILDERS: Record<string, ToolBuilder> = {
	[`${TOOL_PREFIX}delegate`]: () =>
		tool({
			description: "Delegate a task to a CEO sub-agent.",
			args: {
				agent: z.string(),
				prompt: z.string(),
				timeout: z.number().optional(),
			},
			async execute(args, context) {
				return executeCeoDelegate(args, context);
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
		createStubTool(
			`${TOOL_PREFIX}context_pack`,
			"Pack context for a pipeline handoff.",
			{
				pipeline_id: z.string(),
			},
		),
	[`${TOOL_PREFIX}context_restore`]: () =>
		createStubTool(
			`${TOOL_PREFIX}context_restore`,
			"Restore packed context into a session.",
			{
				session_id: z.string(),
			},
		),
};

export const CEO_TOOL_NAMES = Object.freeze(Object.keys(TOOL_BUILDERS));

export function createToolDefinitions(
	deps: ToolFactoryDeps,
): Record<string, ToolDefinition> {
	void deps.directory;
	void deps.worktree;

	return Object.fromEntries(
		Object.entries(TOOL_BUILDERS).map(([name, buildTool]) => [
			name,
			buildTool(deps),
		]),
	);
}
