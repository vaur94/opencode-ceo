import { getDatabase } from "../state/database.js"

export async function executeDecisionLog(
	params: { pipeline_id: string; stage: string; decision: string; reasoning?: string },
	context: { directory: string },
): Promise<string> {
	try {
		const db = getDatabase(context.directory)
		db.run(
			"INSERT INTO decisions VALUES (?, ?, ?, ?, ?, ?)",
			[
				crypto.randomUUID(),
				params.pipeline_id,
				params.stage,
				params.decision,
				params.reasoning ?? null,
				Date.now(),
			],
		)
		return `Decision logged: ${params.decision}`
	} catch (e) {
		return `Error logging decision: ${String(e)}`
	}
}
