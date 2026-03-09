import { Database } from "bun:sqlite"
import type { PluginInput } from "@opencode-ai/plugin"
import type { ToolContext } from "@opencode-ai/plugin/tool"

import { initializeDatabase } from "../../src/state/database.js"

export function createTestDatabase(): Database {
  const db = new Database(":memory:")
  initializeDatabase(db)
  return db
}

export function createMockPluginInput(): Pick<PluginInput, "directory" | "worktree" | "client"> {
	return {
		directory: "/tmp/test-project",
		worktree: "/tmp/test-project",
		client: {
			session: {
				create: async () => ({ data: { id: "mock-session-id" } }),
				promptAsync: async () => {},
				status: async () => ({ data: { "mock-session-id": { type: "idle" } } }),
				messages: async () => ({
					data: [
						{
							role: "assistant",
							parts: [{ type: "text", text: "Delegated successfully" }],
						},
					],
				}),
				abort: async () => {},
			},
		} as unknown as PluginInput["client"],
	}
}

export function createMockToolContext() {
	return {
		sessionID: "mock-session-id",
		directory: "/tmp/test-project",
		ask: async (_request: unknown) => {},
	}
}

export function createMockToolExecutionContext(
	overrides: Partial<ToolContext> = {},
): ToolContext {
	return {
		sessionID: "mock-session-id",
		messageID: "mock-message-id",
		agent: "ceo",
		directory: "/tmp/test-project",
		worktree: "/tmp/test-project",
		abort: new AbortController().signal,
		metadata() {},
		ask: async () => {},
		...overrides,
	}
}
