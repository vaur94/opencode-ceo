export class CeoLogger {
  private readonly sessionId: string
  private readonly pipelineId?: string

  constructor(sessionId: string, pipelineId?: string) {
    this.sessionId = sessionId
    this.pipelineId = pipelineId
  }

  logTransition(from: string, to: string, reason: string): void {
    this.logEvent("transition", { from, to, reason })
  }

  logDelegation(agent: string, prompt: string): void {
    this.logEvent("delegation", { agent, prompt })
  }

  logGateEvent(
    gateName: string,
    status: "approved" | "denied" | "pending",
  ): void {
    this.logEvent("gate", { gate_name: gateName, status })
  }

  logError(context: string, error: unknown): void {
    this.logEvent("error", { context, error: this.normalizeError(error) })
  }

  logInfo(message: string, data?: Record<string, unknown>): void {
    this.logEvent("info", { message, ...(data ?? {}) })
  }

  private logEvent(event: string, payload: Record<string, unknown>): void {
    console.log("[CEO]", {
      ...this.getBaseContext(),
      event,
      ...payload,
    })
  }

  private getBaseContext(): { session_id: string; pipeline_id?: string } {
    if (this.pipelineId !== undefined) {
      return {
        session_id: this.sessionId,
        pipeline_id: this.pipelineId,
      }
    }

    return {
      session_id: this.sessionId,
    }
  }

  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    if (typeof error === "string") {
      return {
        message: error,
      }
    }

    if (typeof error === "object" && error !== null) {
      return {
        value: error,
      }
    }

    return {
      value: String(error),
    }
  }
}

export function createLogger(sessionId: string, pipelineId?: string): CeoLogger {
  return new CeoLogger(sessionId, pipelineId)
}
