import { getDatabase } from "../state/database.js"
import { getPipeline } from "../state/pipeline-store.js"
import { listArtifacts } from "../state/artifact-manager.js"

export async function executeDeliveryFormat(
	params: { pipeline_id: string; format?: string },
	context: { directory: string },
): Promise<string> {
	try {
		const db = getDatabase(context.directory)
		const pipeline = getPipeline(db, params.pipeline_id)
		if (!pipeline) return `Error: Pipeline not found: ${params.pipeline_id}`

		const artifacts = listArtifacts(db, params.pipeline_id)
		const artifactSummary = artifacts
			.map((a) => `- ${a.stage}/${a.type}: ${a.path}`)
			.join("\n") || "No artifacts"

		return `# Delivery Summary\nPipeline: ${params.pipeline_id}\nGoal: ${pipeline.goal}\nState: ${pipeline.state}\nCreated: ${new Date(
			pipeline.created_at,
		).toISOString()}\n\n## Artifacts\n${artifactSummary}`
	} catch (e) {
		return `Error formatting delivery: ${String(e)}`
	}
}
