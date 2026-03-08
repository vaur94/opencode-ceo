export type { ArtifactEntry, ArtifactType } from "../state/artifact-types.js"
export type { PipelineRun, PipelineState, StageExecution } from "../state/types.js"

export interface AgentContract {
  id: string
  mode: "primary" | "subagent"
  hidden: boolean
  purpose: string
  inputArtifact: string
  outputArtifact: string
  allowedTools: string[]
  deniedTools: string[]
  successSignal: string
  failurePolicy: string
}

export type ToolRestrictions = Record<string, boolean>

export interface DelegationRequest {
  targetAgent: string
  prompt: string
  tools: ToolRestrictions
  timeout: number
}

export interface DelegationResult {
  success: boolean
  output: string
  sessionID: string
  error?: string
}

export type GateConfig = { autoApprove: boolean; timeoutMs?: number }

export interface PipelineConfig {
  gates: Record<string, GateConfig>
  autonomy: "full" | "gated" | "supervised"
}

export interface StackFingerprint {
  primaryLanguage: string
  frameworks: string[]
  buildTool: string
  testTool: string
  packageManager: string
}
