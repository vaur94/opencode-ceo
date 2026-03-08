import { AGENT_PREFIX } from "../core/constants.js"
import type { AgentContract, ToolRestrictions } from "../core/types.js"

const CEO_AGENT_ID = "ceo" as const

export const AGENT_IDS = [
  CEO_AGENT_ID,
  "ceo-architect",
  "ceo-implementer",
  "ceo-reviewer",
  "ceo-tester",
  "ceo-ts-specialist",
  "ceo-python-specialist",
  "ceo-go-specialist",
] as const

export type AgentId = (typeof AGENT_IDS)[number]

const AGENT_CONTRACTS: Record<AgentId, AgentContract> = {
  ceo: {
    id: "ceo",
    mode: "primary",
    hidden: false,
    purpose: "Own the delivery pipeline, delegate specialist work, and make final delivery decisions without editing code directly.",
    inputArtifact: "task-brief",
    outputArtifact: "delivery-decision",
    allowedTools: [
      "ceo_delegate",
      "ceo_stage_transition",
      "ceo_gate_run",
      "ceo_gate_status",
      "ceo_artifact_write",
      "ceo_artifact_read",
      "ceo_decision_log",
      "ceo_branch_prepare",
      "ceo_pr_prepare",
      "ceo_repo_fingerprint",
      "ceo_stack_detect",
      "ceo_delivery_format",
      "ceo_context_pack",
      "ceo_context_restore",
    ],
    deniedTools: ["write", "edit", "bash", "read"],
    successSignal: "The pipeline advances with a complete delegation, gate, or delivery decision.",
    failurePolicy: "Record the failure, keep the task in pipeline state, and avoid direct implementation work.",
  },
  "ceo-architect": {
    id: "ceo-architect",
    mode: "subagent",
    hidden: true,
    purpose: "Break complex work into implementation-ready plans, contracts, and constraints.",
    inputArtifact: "task-brief",
    outputArtifact: "implementation-plan",
    allowedTools: [],
    deniedTools: ["bash", "write", "edit", "task"],
    successSignal: "A concrete plan or architecture recommendation is returned.",
    failurePolicy: "Explain the missing context or conflicting constraints instead of guessing.",
  },
  "ceo-implementer": {
    id: "ceo-implementer",
    mode: "subagent",
    hidden: true,
    purpose: "Implement scoped code changes and validate them locally.",
    inputArtifact: "implementation-plan",
    outputArtifact: "code-change",
    allowedTools: ["read", "write", "edit", "bash", "glob", "grep"],
    deniedTools: ["task"],
    successSignal: "Requested code changes are applied and verified.",
    failurePolicy: "Stop after reporting the concrete blocker and attempted fixes.",
  },
  "ceo-reviewer": {
    id: "ceo-reviewer",
    mode: "subagent",
    hidden: true,
    purpose: "Review code changes for correctness, risk, and standards compliance.",
    inputArtifact: "code-change",
    outputArtifact: "review-findings",
    allowedTools: ["read", "glob", "grep", "bash"],
    deniedTools: ["write", "edit", "task"],
    successSignal: "Review findings identify approval, risk, or required follow-up.",
    failurePolicy: "Return the exact review gap instead of making code changes.",
  },
  "ceo-tester": {
    id: "ceo-tester",
    mode: "subagent",
    hidden: true,
    purpose: "Run focused validation and report whether the change is safe to ship.",
    inputArtifact: "code-change",
    outputArtifact: "test-report",
    allowedTools: ["read", "bash", "glob", "grep"],
    deniedTools: ["write", "edit", "task"],
    successSignal: "Relevant checks run with a clear pass or fail result.",
    failurePolicy: "Surface the failing verification step and captured evidence.",
  },
  "ceo-ts-specialist": {
    id: "ceo-ts-specialist",
    mode: "subagent",
    hidden: true,
    purpose: "Handle TypeScript-heavy implementation and type-system issues.",
    inputArtifact: "typed-change-request",
    outputArtifact: "typed-code-change",
    allowedTools: ["read", "write", "edit", "bash", "glob", "grep"],
    deniedTools: ["task"],
    successSignal: "TypeScript changes compile with the intended behavior.",
    failurePolicy: "Report the type constraint or build blocker with the failed check.",
  },
  "ceo-python-specialist": {
    id: "ceo-python-specialist",
    mode: "subagent",
    hidden: true,
    purpose: "Handle Python-specific implementation and runtime issues.",
    inputArtifact: "python-change-request",
    outputArtifact: "python-code-change",
    allowedTools: ["read", "write", "edit", "bash", "glob", "grep"],
    deniedTools: ["task"],
    successSignal: "Python changes are applied with relevant verification evidence.",
    failurePolicy: "Report the runtime or dependency blocker instead of expanding scope.",
  },
  "ceo-go-specialist": {
    id: "ceo-go-specialist",
    mode: "subagent",
    hidden: true,
    purpose: "Handle Go-specific implementation and tooling issues.",
    inputArtifact: "go-change-request",
    outputArtifact: "go-code-change",
    allowedTools: ["read", "write", "edit", "bash", "glob", "grep"],
    deniedTools: ["task"],
    successSignal: "Go changes are applied with relevant verification evidence.",
    failurePolicy: "Report the compiler or tooling blocker instead of guessing.",
  },
}

function isAgentId(agentId: string): agentId is AgentId {
  return agentId in AGENT_CONTRACTS
}

export function getAgentContract(agentId: string): AgentContract {
  if (!isAgentId(agentId)) {
    throw new Error(`Unknown agent contract: ${agentId}`)
  }

  return AGENT_CONTRACTS[agentId]
}

export function getToolRestrictions(agentId: string): ToolRestrictions {
  const contract = getAgentContract(agentId)
  const restrictions: ToolRestrictions = { question: false }

  for (const tool of contract.allowedTools) {
    restrictions[tool] = true
  }

  for (const tool of contract.deniedTools) {
    restrictions[tool] = false
  }

  return restrictions
}

export function isValidDelegationTarget(fromAgent: string, toAgent: string): boolean {
  if (!isAgentId(fromAgent) || !isAgentId(toAgent)) {
    return false
  }

  if (toAgent === CEO_AGENT_ID) {
    return false
  }

  if (fromAgent !== CEO_AGENT_ID) {
    return false
  }

  return toAgent.startsWith(AGENT_PREFIX)
}
