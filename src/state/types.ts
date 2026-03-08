export type PipelineState =
  | "intake"
  | "decompose"
  | "implement"
  | "review"
  | "test"
  | "deliver"
  | "completed"
  | "failed"
  | "blocked"
  | "interrupted"

export interface PipelineRun {
  id: string
  session_id: string
  state: PipelineState
  previous_state: string | null
  goal: string
  created_at: number
  updated_at: number
  metadata: string | null
}

export interface StageExecution {
  id: string
  pipeline_id: string
  stage: string
  status: "running" | "completed" | "failed" | "skipped"
  started_at: number
  completed_at: number | null
  agent_session: string | null
  result: string | null
  error: string | null
  retry_count: number
}
