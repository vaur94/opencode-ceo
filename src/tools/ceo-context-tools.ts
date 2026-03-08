import { packPipelineContext } from "../context/context-packer.js"
import { restoreFromDatabase } from "../context/context-restorer.js"
import { listArtifacts } from "../state/artifact-manager.js"
import { getDatabase } from "../state/database.js"
import { getPipeline } from "../state/pipeline-store.js"
import { getStageHistory } from "../state/stage-store.js"

export async function executeCeoContextPack(
  params: { pipeline_id: string },
  context: { directory: string; sessionID: string },
): Promise<string> {
  try {
    const db = getDatabase(context.directory)
    const pipeline = getPipeline(db, params.pipeline_id)

    if (!pipeline) {
      return `Error: Pipeline ${params.pipeline_id} not found`
    }

    const stages = getStageHistory(db, params.pipeline_id)
    const artifactCount = listArtifacts(db, params.pipeline_id).length

    return packPipelineContext(pipeline, stages, artifactCount)
  } catch (e) {
    return `Error: ${String(e)}`
  }
}

export async function executeCeoContextRestore(
  params: { session_id: string },
  context: { directory: string; sessionID: string },
): Promise<string> {
  try {
    const db = getDatabase(context.directory)
    const pipeline = restoreFromDatabase(db, params.session_id)

    if (!pipeline) {
      return `No active pipeline found for session ${params.session_id}`
    }

    return JSON.stringify(pipeline)
  } catch (e) {
    return `Error: ${String(e)}`
  }
}
