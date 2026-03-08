export class CeoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message)
    this.name = "CeoError"
  }
}

export class InvalidTransitionError extends CeoError {
  constructor(from: string, to: string) {
    super(`Invalid pipeline transition: ${from} -> ${to}`, "INVALID_TRANSITION")
    this.name = "InvalidTransitionError"
  }
}

export class DelegationError extends CeoError {
  constructor(agent: string, reason: string) {
    super(`Delegation to ${agent} failed: ${reason}`, "DELEGATION_FAILED")
    this.name = "DelegationError"
  }
}

export class GateTimeoutError extends CeoError {
  constructor(gateName: string) {
    super(`Gate timed out: ${gateName}`, "GATE_TIMEOUT")
    this.name = "GateTimeoutError"
  }
}

export class ArtifactNotFoundError extends CeoError {
  constructor(pipelineId: string, stage: string, type: string) {
    super(`Artifact not found: ${pipelineId}/${stage}/${type}`, "ARTIFACT_NOT_FOUND")
    this.name = "ArtifactNotFoundError"
  }
}
