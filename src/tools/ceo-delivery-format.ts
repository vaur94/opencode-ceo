import { getDatabase } from "../state/database.js"
import { getPipeline } from "../state/pipeline-store.js"
import { listArtifacts } from "../state/artifact-manager.js"

function extractPrLink(artifacts: ReturnType<typeof listArtifacts>): string {
	const deliveryArtifact = artifacts.find((artifact) => artifact.stage === "deliver" && artifact.type === "pr-url")
	return deliveryArtifact?.path ?? "No PR artifact"
}

export async function executeDeliveryFormat(
	params: { pipeline_id: string; format?: string },
	context: { directory: string },
): Promise<string> {
	try {
		const db = getDatabase(context.directory)
		const pipeline = getPipeline(db, params.pipeline_id)
		if (!pipeline) return `Error: Pipeline not found: ${params.pipeline_id}`

		const artifacts = listArtifacts(db, params.pipeline_id)
		const completedTasks = Array.from(new Set(artifacts.map((artifact) => artifact.stage)))
		const artifactSummary = artifacts
			.map((a) => `- ${a.stage}/${a.type}: ${a.path}`)
			.join("\n") || "No artifacts"
		const filesChanged = artifacts.map((artifact) => artifact.path)
		const prLink = extractPrLink(artifacts)
		const decisions = db
			.query<{ stage: string; decision: string }, [string]>(
				"SELECT stage, decision FROM decisions WHERE pipeline_id = ?1 ORDER BY created_at ASC, id ASC",
			)
			.all(params.pipeline_id)
			.map((decision) => `- ${decision.stage}: ${decision.decision}`)
			.join("\n") || "No decisions"

		return `# Delivery Summary\nPipeline: ${params.pipeline_id}\nGoal: ${pipeline.goal}\nState: ${pipeline.state}\nCreated: ${new Date(
			pipeline.created_at,
		).toISOString()}\n\n## Tasks Completed\n${completedTasks.map((stage) => `- ${stage}`).join("\n") || "No completed tasks"}\n\n## Files Changed\n${filesChanged.map((path) => `- ${path}`).join("\n") || "No files changed"}\n\n## PR Link\n${prLink}\n\n## Decisions\n${decisions}\n\n## Artifacts\n${artifactSummary}`
	} catch (e) {
		return `Error formatting delivery: ${String(e)}`
	}
}
