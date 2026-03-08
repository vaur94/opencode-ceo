import { getDatabase } from "../state/database.js"
import { readArtifact, writeArtifact } from "../state/artifact-manager.js"
import type { ArtifactType } from "../state/artifact-types.js"

export async function executeArtifactWrite(
	params: {
		pipeline_id: string
		stage: string
		type: string
		data: Record<string, unknown>
	},
	context: { directory: string },
): Promise<string> {
	try {
		const db = getDatabase(context.directory)
		const path = writeArtifact(db, params.pipeline_id, params.stage, params.type as ArtifactType, params.data)
		return `Artifact written to ${path}`
	} catch (e) {
		return `Error writing artifact: ${String(e)}`
	}
}

export async function executeArtifactRead(
	params: { pipeline_id: string; stage: string; type: string },
	context: { directory: string },
): Promise<string> {
	try {
		const db = getDatabase(context.directory)
		const data = readArtifact(db, params.pipeline_id, params.stage, params.type as ArtifactType)
		if (!data) return "Artifact not found"
		return JSON.stringify(data, null, 2)
	} catch (e) {
		return `Error reading artifact: ${String(e)}`
	}
}
