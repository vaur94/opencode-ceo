import { describe, expect, mock, test } from "bun:test"

import { TOOL_PREFIX } from "../../../src/core/constants.ts"
import { executeCeoDelegate, type ToolContext } from "../../../src/tools/ceo-delegate.ts"
import { createToolDefinitions } from "../../../src/tools/tool-factory.ts"

type MockCall<TArgs> = TArgs extends undefined ? [] : [TArgs]

type CreateArgs = { body: Record<string, unknown>; query: { directory: string } }
type PromptArgs = {
  path: { id: string }
  body: { agent: string; tools: Record<string, boolean>; parts: Array<{ type: string; text: string }> }
  query: { directory: string }
}
type AbortArgs = { path: { id: string }; query: { directory: string } }

function createMockContext(overrides?: Record<string, unknown>): ToolContext {
  const session = {
    create: mock(async () => ({ data: { id: "mock-session-id" } })),
    promptAsync: mock(async () => {}),
    status: mock(async () => ({ data: { "mock-session-id": { type: "idle" } } })),
    messages: mock(async () => ({
      data: [{ role: "assistant", parts: [{ type: "text", text: "Done!" }] }],
    })),
    abort: mock(async () => {}),
    ...overrides,
  }

  return {
    client: { session } as ToolContext["client"],
    directory: "/repo",
    sessionID: "parent-session-id",
  }
}

function firstCall<TArgs>(fn: { mock: { calls: MockCall<TArgs>[] } }): TArgs {
  return fn.mock.calls[0]?.[0] as TArgs
}

describe("ceo_delegate", () => {
  test("returns delegated assistant output on success", async () => {
    const context = createMockContext()

    const result = await executeCeoDelegate(
      {
        agent: "ceo-implementer",
        prompt: "Implement the change",
      },
      context,
    )

    expect(result).toBe("Done!")

    const createArgs = firstCall<CreateArgs>(context.client.session.create)
    const promptArgs = firstCall<PromptArgs>(context.client.session.promptAsync)

    expect(createArgs.body).toMatchObject({
      parentID: "parent-session-id",
      title: "Delegation to ceo-implementer",
    })
    expect(createArgs.query).toEqual({ directory: "/repo" })
    expect(promptArgs.path).toEqual({ id: "mock-session-id" })
    expect(promptArgs.body.agent).toBe("ceo-implementer")
    expect(promptArgs.body.parts).toEqual([{ type: "text", text: "Implement the change" }])
    expect(promptArgs.body.tools.read).toBeTrue()
    expect(promptArgs.body.tools.write).toBeTrue()
    expect(promptArgs.body.tools.edit).toBeTrue()
    expect(promptArgs.body.tools.bash).toBeTrue()
    expect(promptArgs.body.tools[`${TOOL_PREFIX}delegate`]).toBeFalse()
    expect(promptArgs.query).toEqual({ directory: "/repo" })
  })

  test("returns an error for invalid delegation targets", async () => {
    const context = createMockContext()

    const result = await executeCeoDelegate(
      {
        agent: "ceo",
        prompt: "Do the work",
      },
      context,
    )

    expect(result).toContain('Error: Invalid delegation target "ceo"')
    expect(result).toContain("ceo-architect")
    expect(context.client.session.create).not.toHaveBeenCalled()
  })

  test("returns a helpful unauthorized error when sub-session creation is blocked", async () => {
    const context = createMockContext({
      create: mock(async () => {
        throw new Error("Unauthorized")
      }),
    })

    const result = await executeCeoDelegate(
      {
        agent: "ceo-reviewer",
        prompt: "Review this",
      },
      context,
    )

    expect(result).toBe("Error: Delegation failed - OAuth token restricted. Check authentication.")
    expect(context.client.session.promptAsync).not.toHaveBeenCalled()
  })

  test("aborts the delegated session when it times out", async () => {
    const context = createMockContext({
      status: mock(async () => ({ data: { "mock-session-id": { type: "running" } } })),
    })

    const result = await executeCeoDelegate(
      {
        agent: "ceo-tester",
        prompt: "Run tests",
        timeout: 0,
      },
      context,
    )

    expect(result).toBe("Error: Delegation to ceo-tester timed out after 0ms")
    expect(context.client.session.abort).toHaveBeenCalledTimes(1)
    expect(firstCall<AbortArgs>(context.client.session.abort)).toEqual({
      path: { id: "mock-session-id" },
      query: { directory: "/repo" },
    })
  })

  test("tool factory wires ceo_delegate to the real implementation", async () => {
    const definitions = createToolDefinitions({
      directory: "/repo",
      worktree: "/repo",
    })
    const context = createMockContext()

    const result = await definitions[`${TOOL_PREFIX}delegate`].execute(
      {
        agent: "ceo-architect",
        prompt: "Plan this change",
      },
      context,
    )

    expect(result).toBe("Done!")
    expect(context.client.session.create).toHaveBeenCalledTimes(1)
  })
})
