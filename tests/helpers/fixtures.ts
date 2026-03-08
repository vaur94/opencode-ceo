export const samplePipelineData = {
  id: "test-pipeline-123",
  session_id: "test-session-456",
  state: "intake" as const,
  previous_state: null,
  goal: "Build a REST API",
  created_at: Date.now(),
  updated_at: Date.now(),
  metadata: null,
}

export const sampleStageData = {
  id: "test-stage-789",
  pipeline_id: "test-pipeline-123",
  stage: "intake",
  status: "running" as const,
  started_at: Date.now(),
  completed_at: null,
  agent_session: null,
  result: null,
  error: null,
  retry_count: 0,
}

export const sampleArtifactData = {
  type: "plan" as const,
  stage: "decompose",
  data: { tasks: [{ id: "t1", title: "Create API", description: "..." }] },
}
