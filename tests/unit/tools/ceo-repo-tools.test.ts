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
import { createMockPluginInput, createMockToolExecutionContext } from "../../helpers/test-utils.ts";

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
			remoteUrl: string | null;
			gitStatus: string[];
		};

		expect(parsed.directory).toBe(projectDirectory);
		expect(parsed.isGitRepo).toBeTrue();
		expect(parsed.currentBranch).toBe(await getCurrentBranch(projectDirectory));
		expect(parsed.hasRemote).toBe(await hasRemote(projectDirectory));
		expect(parsed.isGitHubRemote).toBe(await isGitHubRemote(projectDirectory));
		expect(Array.isArray(parsed.gitStatus)).toBeTrue();
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
			client: createMockPluginInput().client,
		});
		const repoFingerprintTool = definitions[`${TOOL_PREFIX}repo_fingerprint`];
		const stackDetectTool = definitions[`${TOOL_PREFIX}stack_detect`];
		const toolContext = createMockToolExecutionContext({
			directory: projectDirectory,
			worktree: projectDirectory,
			sessionID: "session-22",
		});

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

		const parsedFingerprint = JSON.parse(repoFingerprintResult) as {
			directory: string;
			isGitRepo: boolean;
			currentBranch: string;
			hasRemote: boolean;
			isGitHubRemote: boolean;
			remoteUrl: string | null;
			gitStatus: string[];
		};

		expect(parsedFingerprint.directory).toBe(projectDirectory);
		expect(parsedFingerprint.isGitRepo).toBeTrue();
		expect(parsedFingerprint.currentBranch).toBe(await getCurrentBranch(projectDirectory));
		expect(parsedFingerprint.hasRemote).toBe(await hasRemote(projectDirectory));
		expect(parsedFingerprint.isGitHubRemote).toBe(await isGitHubRemote(projectDirectory));
		expect(Array.isArray(parsedFingerprint.gitStatus)).toBeTrue();
		expect(JSON.parse(stackDetectResult)).toEqual(detectStack(projectDirectory));
	});
});
