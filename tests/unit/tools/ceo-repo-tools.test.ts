import { describe, expect, test } from "bun:test";

import { TOOL_PREFIX } from "../../../src/core/constants.ts";
import {
	getCurrentBranch,
	hasRemote,
	isGitHubRemote,
} from "../../../src/github/git-utils.ts";
import { detectStack } from "../../../src/stacks/detector.ts";
import { createToolDefinitions } from "../../../src/tools/tool-factory.ts";
import {
	executeRepoFingerprint,
	executeStackDetect,
} from "../../../src/tools/ceo-repo-tools.ts";

const projectDirectory = process.cwd();

describe("ceo_repo_tools", () => {
	test("repo fingerprint returns live git metadata for the current project", async () => {
		const result = await executeRepoFingerprint(
			{ directory: projectDirectory },
			undefined,
		);
		const parsed = JSON.parse(result) as {
			directory: string;
			isGitRepo: boolean;
			currentBranch: string;
			hasRemote: boolean;
			isGitHubRemote: boolean;
		};

		expect(parsed).toEqual({
			directory: projectDirectory,
			isGitRepo: true,
			currentBranch: await getCurrentBranch(projectDirectory),
			hasRemote: await hasRemote(projectDirectory),
			isGitHubRemote: await isGitHubRemote(projectDirectory),
		});
	});

	test("stack detect returns the live stack fingerprint for the current project", async () => {
		const result = await executeStackDetect(
			{ directory: projectDirectory },
			undefined,
		);
		const parsed = JSON.parse(result);

		expect(parsed).toEqual(detectStack(projectDirectory));
	});

	test("tool factory wires both repo tools to the real implementations", async () => {
		const definitions = createToolDefinitions({
			directory: projectDirectory,
			worktree: projectDirectory,
		});
		const repoFingerprintTool = definitions[`${TOOL_PREFIX}repo_fingerprint`];
		const stackDetectTool = definitions[`${TOOL_PREFIX}stack_detect`];
		const toolContext = {
			directory: projectDirectory,
			sessionID: "session-22",
		} as never;

		if (!repoFingerprintTool || !stackDetectTool) {
			throw new Error("Expected both CEO repo tools to be registered");
		}

		const repoFingerprintResult = await repoFingerprintTool.execute(
			{ directory: projectDirectory },
			toolContext,
		);
		const stackDetectResult = await stackDetectTool.execute(
			{ directory: projectDirectory },
			toolContext,
		);

		expect(JSON.parse(repoFingerprintResult)).toEqual({
			directory: projectDirectory,
			isGitRepo: true,
			currentBranch: await getCurrentBranch(projectDirectory),
			hasRemote: await hasRemote(projectDirectory),
			isGitHubRemote: await isGitHubRemote(projectDirectory),
		});
		expect(JSON.parse(stackDetectResult)).toEqual(detectStack(projectDirectory));
	});
});
