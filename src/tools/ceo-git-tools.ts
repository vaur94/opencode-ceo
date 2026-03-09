import { createBranch } from "../github/branch-manager.js";
import { createPR } from "../github/pr-manager.js";
import { getDatabase } from "../state/database.js";
import { writeArtifact } from "../state/artifact-manager.js";

export async function executeBranchPrepare(
	params: { pipeline_id: string; slug: string },
	context: { directory: string },
): Promise<string> {
	const result = await createBranch(
		context.directory,
		params.pipeline_id,
		params.slug,
	);

	if (result.success) {
		return `Branch created: ${result.branchName}`;
	}

	return `Error creating branch: ${result.error}`;
}

export async function executePrPrepare(
	params: { pipeline_id: string; title: string; body: string },
	context: { directory: string },
): Promise<string> {
	const { pipeline_id, title, body } = params;

	const result = await createPR(context.directory, title, body);

	if (result.success) {
		const db = getDatabase(context.directory);
		writeArtifact(db, pipeline_id, "deliver", "pr-url", {
			pipelineId: pipeline_id,
			prUrl: result.url,
			title,
		});
		return `PR created: ${result.url}`;
	}

	return `Error creating PR: ${result.error}`;
}
