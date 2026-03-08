import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import type { Database } from "bun:sqlite"

import type { ArtifactEntry, ArtifactType } from "./artifact-types.ts"

function resolveArtifactRoot(db: Database): string {
  const filename = db.filename

  if (!filename || filename === ":memory:") {
    return join(process.cwd(), ".ceo")
  }

  return dirname(filename)
}

export function writeArtifact(
  db: Database,
  pipelineId: string,
  stage: string,
  type: ArtifactType,
  data: object,
): string {
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  const artifactDirectory = join(resolveArtifactRoot(db), "artifacts", pipelineId, stage)
  const path = join(artifactDirectory, `${type}.json`)

  mkdirSync(artifactDirectory, { recursive: true })
  writeFileSync(path, JSON.stringify(data), "utf8")

  db.prepare(
    `INSERT INTO artifacts (
      id,
      pipeline_id,
      stage,
      type,
      path,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  ).run(id, pipelineId, stage, type, path, createdAt)

  return path
}

export function readArtifact(
  db: Database,
  pipelineId: string,
  stage: string,
  type: ArtifactType,
): object | null {
  const path = join(resolveArtifactRoot(db), "artifacts", pipelineId, stage, `${type}.json`)

  if (!existsSync(path)) {
    return null
  }

  return JSON.parse(readFileSync(path, "utf8"))
}

export function listArtifacts(db: Database, pipelineId: string): ArtifactEntry[] {
  return db
    .query<ArtifactEntry, [string]>(
      `SELECT id, pipeline_id, stage, type, path, created_at
       FROM artifacts
       WHERE pipeline_id = ?1
       ORDER BY created_at ASC, id ASC`,
    )
    .all(pipelineId)
}
