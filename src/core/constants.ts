import type { PipelineState } from "./types.js"

export const AGENT_PREFIX = "ceo-" as const
export const TOOL_PREFIX = "ceo_" as const
export const MAX_DELEGATION_DEPTH = 2
export const MAX_CONCURRENT_SESSIONS = 5
export const DELEGATION_TIMEOUT_MS = 300_000
export const GATE_TIMEOUT_MS = 1_800_000

export const VALID_TRANSITIONS: Record<PipelineState, PipelineState[]> = {
  intake: ["decompose", "failed"],
  decompose: ["implement", "blocked", "failed"],
  implement: ["review", "implement", "blocked", "failed"],
  review: ["test", "implement", "failed"],
  test: ["deliver", "implement", "failed"],
  deliver: ["completed", "failed"],
  completed: [],
  failed: [],
  blocked: ["intake", "decompose", "implement", "review", "test", "deliver", "failed"],
  interrupted: ["intake", "decompose", "implement", "review", "test", "deliver"],
}

export const TERMINAL_STATES: PipelineState[] = ["completed", "failed"]

export const GATE_NAMES = {
  APPROVE_PLAN: "approve-plan",
  APPROVE_REVIEW: "approve-review",
  APPROVE_DELIVERY: "approve-delivery",
} as const
