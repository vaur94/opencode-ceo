import { describe, expect, mock, test } from "bun:test";

import { TOOL_PREFIX } from "../../../src/core/constants.ts";

type CreateBranchResult =
	| { success: true; branchName: string }
	| { success: false; error: string };

type CreatePRResult =
	| { success: true; url: string }
	| { success: false; error: string };

const createBranchMock = mock(async (_directory: string, pipelineId: string, slug: string) => ({
	success: true as const,
	branchName: `ceo/${pipelineId}/${slug}`,
}) satisfies CreateBranchResult);
const createPRMock = mock(
	async (): Promise<CreatePRResult> => ({
		success: true,
		url: "https://github.com/example/repo/pull/123",
	}),
);

mock.module("../../../src/github/branch-manager.js", () => ({
	createBranch: createBranchMock,
}));

mock.module("../../../src/github/pr-manager.js", () => ({
	createPR: createPRMock,
}));

const { executeBranchPrepare, executePrPrepare } = await import(
	"../../../src/tools/ceo-git-tools.ts"
);
const { createToolDefinitions } = await import(
	"../../../src/tools/tool-factory.ts"
);

describe("ceo_git_tools", () => {
	test("branch prepare returns a created branch message from the mocked helper", async () => {
		const result = await executeBranchPrepare(
			{
				pipeline_id: "pipe-21",
				slug: "ship-git-tools",
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toBe("Branch created: ceo/pipe-21/ship-git-tools");
		expect(createBranchMock).toHaveBeenCalledWith(
			"/repo",
			"pipe-21",
			"ship-git-tools",
		);
	});

	test("branch prepare preserves the ceo prefix in the returned branch name", async () => {
		createBranchMock.mockResolvedValueOnce({
			success: true,
			branchName: "ceo/pipe-22/prepare-branch",
		});

		const result = await executeBranchPrepare(
			{
				pipeline_id: "pipe-22",
				slug: "prepare-branch",
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toContain("ceo/");
		expect(result).toBe("Branch created: ceo/pipe-22/prepare-branch");
	});

	test("pr prepare returns the helper error when GitHub auth is unavailable", async () => {
		createPRMock.mockResolvedValueOnce({
			success: false,
			error: "GitHub CLI not authenticated. Run: gh auth login",
		});

		const result = await executePrPrepare(
			{
				pipeline_id: "pipe-23",
				title: "feat: implement git tools",
				body: "Implements CEO git tools.",
			},
			{
				directory: "/repo",
			},
		);

		expect(result).toBe(
			"Error creating PR: GitHub CLI not authenticated. Run: gh auth login",
		);
		expect(createPRMock).toHaveBeenCalledWith(
			"/repo",
			"feat: implement git tools",
			"Implements CEO git tools.",
		);
	});

	test("tool factory wires both git tools to the real implementations", async () => {
		const definitions = createToolDefinitions({
			directory: "/repo",
			worktree: "/repo",
		});
		const branchTool = definitions[`${TOOL_PREFIX}branch_prepare`];
		const prTool = definitions[`${TOOL_PREFIX}pr_prepare`];
		const toolContext = {
			directory: "/repo",
			sessionID: "session-24",
		} as never;

		if (!branchTool || !prTool) {
			throw new Error("Expected both CEO git tools to be registered");
		}

		createBranchMock.mockResolvedValueOnce({
			success: true,
			branchName: "ceo/pipe-24/factory-branch",
		});
		createPRMock.mockResolvedValueOnce({
			success: true,
			url: "https://github.com/example/repo/pull/456",
		});

		const branchResult = await branchTool.execute(
			{
				pipeline_id: "pipe-24",
				slug: "factory-branch",
			},
			toolContext,
		);
		const prResult = await prTool.execute(
			{
				pipeline_id: "pipe-24",
				title: "feat: git prep",
				body: "Adds git prep tools.",
			},
			toolContext,
		);

		expect(branchResult).toBe("Branch created: ceo/pipe-24/factory-branch");
		expect(prResult).toBe("PR created: https://github.com/example/repo/pull/456");
	});
});
