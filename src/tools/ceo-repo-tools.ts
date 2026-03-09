import { detectStack } from "../stacks/detector.js";
import {
	isGitRepo,
	getCurrentBranch,
	hasRemote,
	isGitHubRemote,
} from "../github/git-utils.js";
import { $ } from "bun";

async function getGitStatus(directory: string): Promise<string[]> {
	try {
		const result = await $`git -C ${directory} status --short`.text();
		return result
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	} catch {
		return [];
	}
}

async function getRemoteUrl(directory: string): Promise<string | null> {
	try {
		const result = await $`git -C ${directory} remote get-url origin`.text();
		return result.trim() || null;
	} catch {
		return null;
	}
}

export async function executeRepoFingerprint(
	params: { directory: string },
	_context: unknown,
): Promise<string> {
	const dir = params.directory;
	const isGit = await isGitRepo(dir);
	const branch = isGit ? await getCurrentBranch(dir) : "not-a-git-repo";
	const remote = isGit ? await hasRemote(dir) : false;
	const isGH = remote ? await isGitHubRemote(dir) : false;
	const gitStatus = isGit ? await getGitStatus(dir) : [];
	const remoteUrl = remote ? await getRemoteUrl(dir) : null;

	return JSON.stringify(
		{
			directory: dir,
			isGitRepo: isGit,
			currentBranch: branch,
			hasRemote: remote,
			isGitHubRemote: isGH,
			remoteUrl,
			gitStatus,
		},
		null,
		2,
	);
}

export async function executeStackDetect(
	params: { directory: string },
	_context: unknown,
): Promise<string> {
	const fingerprint = detectStack(params.directory);
	return JSON.stringify(fingerprint, null, 2);
}
