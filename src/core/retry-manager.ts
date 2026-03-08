import type { PipelineState } from "./types.js"

export type RetryDisposition = "retryable" | "fatal"

export interface RetryPolicy {
  readonly limits: Record<string, number>
  readonly defaultLimit: number
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly circuitBreakerThreshold: number
}

const RETRY_LIMITS: Record<string, number> = {
  implement: 3,
  review: 1,
  test: 2,
  deliver: 1,
}

const DEFAULT_RETRY_LIMIT = 1
const BASE_DELAY_MS = 100
const MAX_DELAY_MS = 5_000
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5

const RETRYABLE_PATTERNS = ["timeout", "etimedout", "econnreset", "transient", "rate limit"]
const FATAL_PATTERNS = ["unauthorized", "401", "403", "invalid state", "not found"]

export function classifyError(error: unknown): RetryDisposition {
  const message = getErrorMessage(error).toLowerCase()

  if (FATAL_PATTERNS.some((pattern) => message.includes(pattern))) {
    return "fatal"
  }

  if (RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return "retryable"
  }

  return "retryable"
}

export function getRetryLimit(stage: string): number {
  return RETRY_LIMITS[stage] ?? DEFAULT_RETRY_LIMIT
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return String(error)
}

function getBackoffDelay(attempt: number, policy: RetryPolicy): number {
  return Math.min(policy.baseDelayMs * 2 ** attempt, policy.maxDelayMs)
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error(getErrorMessage(error))
}

export class RetryManager {
  private readonly policy: RetryPolicy
  private readonly consecutiveFailures = new Map<string, number>()

  constructor(policy: Partial<RetryPolicy> = {}) {
    this.policy = {
      limits: { ...RETRY_LIMITS, ...(policy.limits ?? {}) },
      defaultLimit: policy.defaultLimit ?? DEFAULT_RETRY_LIMIT,
      baseDelayMs: policy.baseDelayMs ?? BASE_DELAY_MS,
      maxDelayMs: policy.maxDelayMs ?? MAX_DELAY_MS,
      circuitBreakerThreshold: policy.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
    }
  }

  getRetryLimit(stage: string): number {
    return this.policy.limits[stage] ?? this.policy.defaultLimit
  }

  getConsecutiveFailures(stage: string): number {
    return this.consecutiveFailures.get(stage) ?? 0
  }

  reset(stage?: string): void {
    if (stage) {
      this.consecutiveFailures.delete(stage)
      return
    }

    this.consecutiveFailures.clear()
  }

  async withRetry<T>(stage: PipelineState | string, fn: () => Promise<T>, maxAttempts?: number): Promise<T> {
    const stageKey = stage
    const retryLimit = maxAttempts ?? this.getRetryLimit(stageKey)

    this.assertCircuitClosed(stageKey)

    let lastError: Error | undefined

    for (let attempt = 0; attempt < retryLimit; attempt += 1) {
      try {
        const result = await fn()
        this.reset(stageKey)
        return result
      } catch (error: unknown) {
        const normalizedError = toError(error)
        lastError = normalizedError
        const classification = classifyError(normalizedError)

        if (classification === "fatal") {
          this.recordFailure(stageKey)
          throw normalizedError
        }

        const failureCount = this.recordFailure(stageKey)

        if (failureCount >= this.policy.circuitBreakerThreshold) {
          throw new Error(
            `Circuit breaker open for stage ${stageKey} after ${failureCount} consecutive failures`,
          )
        }

        if (attempt >= retryLimit - 1) {
          throw normalizedError
        }

        await Bun.sleep(getBackoffDelay(attempt, this.policy))
      }
    }

    throw lastError ?? new Error(`Retry execution failed for stage ${stageKey}`)
  }

  private assertCircuitClosed(stage: string): void {
    const failureCount = this.getConsecutiveFailures(stage)

    if (failureCount >= this.policy.circuitBreakerThreshold) {
      throw new Error(`Circuit breaker open for stage ${stage} after ${failureCount} consecutive failures`)
    }
  }

  private recordFailure(stage: string): number {
    const nextCount = this.getConsecutiveFailures(stage) + 1
    this.consecutiveFailures.set(stage, nextCount)
    return nextCount
  }
}

const defaultRetryManager = new RetryManager()

export async function withRetry<T>(stage: string, fn: () => Promise<T>, maxAttempts?: number): Promise<T> {
  return defaultRetryManager.withRetry(stage, fn, maxAttempts)
}
