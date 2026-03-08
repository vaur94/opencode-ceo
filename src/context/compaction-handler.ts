import type { Database } from "bun:sqlite"

import { getStageHistory } from "../state/stage-store.js"
import { packPipelineContext } from "./context-packer.js"
import { restoreFromDatabase } from "./context-restorer.js"

interface SessionCompactingInput {
  sessionID: string
}

interface SessionCompactingOutput {
  context: string[]
  prompt?: string
}

function getArtifactCount(db: Database, pipelineId: string): number {
  const row = db
    .query<{ count: number }, [string]>(
      `SELECT COUNT(*) as count
       FROM artifacts
       WHERE pipeline_id = ?1`,
    )
    .get(pipelineId)

  return row?.count ?? 0
}

export function createCompactionHandler(db: Database) {
  return async function handleCompaction(
    input: SessionCompactingInput,
    output: SessionCompactingOutput,
  ): Promise<void> {
    const pipeline = restoreFromDatabase(db, input.sessionID)

    if (!pipeline) {
      return
    }

    const stages = getStageHistory(db, pipeline.id)
    const artifactCount = getArtifactCount(db, pipeline.id)

    output.context.push(packPipelineContext(pipeline, stages, artifactCount))
  }
}
