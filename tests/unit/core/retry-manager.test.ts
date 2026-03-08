import { describe, expect, test } from "bun:test"

import { RetryManager, classifyError, getRetryLimit, withRetry } from "../../../src/core/retry-manager.ts"

describe("retry manager", () => {
  test("classifyError recognizes retryable and fatal error patterns", () => {
    expect(classifyError(new Error("socket ETIMEDOUT while contacting upstream"))).toBe("retryable")
    expect(classifyError(new Error("Unauthorized request returned 401"))).toBe("fatal")
    expect(classifyError(new Error("unexpected issue"))).toBe("retryable")
  })

  test("getRetryLimit returns per-stage limits and the default fallback", () => {
    expect(getRetryLimit("implement")).toBe(3)
    expect(getRetryLimit("review")).toBe(1)
    expect(getRetryLimit("test")).toBe(2)
    expect(getRetryLimit("deliver")).toBe(1)
    expect(getRetryLimit("unknown-stage")).toBe(1)
  })

  test("retries retryable errors until the function succeeds", async () => {
    let attempts = 0

    const result = await withRetry("implement", async () => {
      attempts += 1

      if (attempts < 3) {
        throw new Error("transient timeout from worker")
      }

      return "ok"
    })

    expect(result).toBe("ok")
    expect(attempts).toBe(3)
  })

  test("fails immediately for fatal errors", async () => {
    let attempts = 0

    await expect(
      withRetry("implement", async () => {
        attempts += 1
        throw new Error("Unauthorized request returned 403")
      }),
    ).rejects.toThrow("Unauthorized request returned 403")

    expect(attempts).toBe(1)
  })

  test("throws after exceeding the retry limit", async () => {
    let attempts = 0

    await expect(
      withRetry("test", async () => {
        attempts += 1
        throw new Error("timeout while waiting for test agent")
      }),
    ).rejects.toThrow("timeout while waiting for test agent")

    expect(attempts).toBe(2)
  })

  test("opens the circuit breaker after consecutive failures", async () => {
    const manager = new RetryManager({
      limits: { implement: 3 },
      circuitBreakerThreshold: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
    })

    await expect(
      manager.withRetry("implement", async () => {
        throw new Error("transient dependency outage")
      }, 1),
    ).rejects.toThrow("transient dependency outage")

    await expect(
      manager.withRetry("implement", async () => {
        throw new Error("transient dependency outage")
      }, 1),
    ).rejects.toThrow("Circuit breaker open for stage implement after 2 consecutive failures")

    await expect(
      manager.withRetry("implement", async () => "ok", 1),
    ).rejects.toThrow("Circuit breaker open for stage implement after 2 consecutive failures")
  })
})
