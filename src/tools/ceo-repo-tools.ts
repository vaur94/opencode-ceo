import { detectStack } from "../stacks/detector.js";
import {
	isGitRepo,
	getCurrentBranch,
	hasRemote,
	isGitHubRemote,
} from "../github/git-utils.js";

export async function executeRepoFingerprint(
	params: { directory: string },
	_context: unknown,
): Promise<string> {
	const dir = params.directory;
	const isGit = await isGitRepo(dir);
	const branch = isGit ? await getCurrentBranch(dir) : "not-a-git-repo";
	const remote = isGit ? await hasRemote(dir) : false;
	const isGH = remote ? await isGitHubRemote(dir) : false;

	return JSON.stringify(
		{
			directory: dir,
			isGitRepo: isGit,
			currentBranch: branch,
			hasRemote: remote,
			isGitHubRemote: isGH,
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
