export type ArtifactType = "plan" | "code-diff" | "review" | "test-result" | "pr-url" | "decision"

export interface ArtifactEntry {
  id: string
  pipeline_id: string
  stage: string
  type: ArtifactType
  path: string
  created_at: number
}
