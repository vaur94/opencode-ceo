import type { PipelineRun, StageExecution } from "../state/types.js"

const MAX_CONTEXT_LENGTH = 500
const MAX_GOAL_LENGTH = 100

function normalizeGoal(goal: string): string {
  return goal.replace(/\s+/g, " ").trim()
}

function truncateGoal(goal: string, maxLength: number): string {
  if (goal.length <= maxLength) {
    return goal
  }

  if (maxLength <= 3) {
    return goal.slice(0, maxLength)
  }

  return `${goal.slice(0, maxLength - 3)}...`
}

export function packPipelineContext(
  pipeline: PipelineRun,
  stages: StageExecution[],
  artifactCount: number,
): string {
  const completed = stages.filter((stage) => stage.status === "completed").length
  const total = stages.length
  const normalizedGoal = normalizeGoal(pipeline.goal)
  let goal = truncateGoal(normalizedGoal, MAX_GOAL_LENGTH)
  let packed = `[CEO State] Pipeline ${pipeline.id}: state=${pipeline.state}, goal="${goal}", progress=${completed}/${total} stages, artifacts=${artifactCount}`

  if (packed.length <= MAX_CONTEXT_LENGTH) {
    return packed
  }

  const templateWithoutGoal = `[CEO State] Pipeline ${pipeline.id}: state=${pipeline.state}, goal="", progress=${completed}/${total} stages, artifacts=${artifactCount}`
  const remainingGoalLength = Math.max(0, MAX_CONTEXT_LENGTH - templateWithoutGoal.length)

  goal = truncateGoal(normalizedGoal, remainingGoalLength)
  packed = `[CEO State] Pipeline ${pipeline.id}: state=${pipeline.state}, goal="${goal}", progress=${completed}/${total} stages, artifacts=${artifactCount}`

  return packed.slice(0, MAX_CONTEXT_LENGTH)
}
