import { Database } from "bun:sqlite"
import type { PluginInput } from "@opencode-ai/plugin"
import type { ToolContext } from "@opencode-ai/plugin/tool"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { initializeDatabase } from "../../src/state/database.js"

function createTempProjectDirectory(): string {
  return mkdtempSync(join(tmpdir(), "opencode-ceo-test-"))
}

export function createTestDatabase(): Database {
  const db = new Database(":memory:")
  initializeDatabase(db)
  return db
}

export function createMockPluginInput(): Pick<PluginInput, "directory" | "worktree" | "client"> {
	const directory = createTempProjectDirectory()

	return {
		directory,
		worktree: directory,
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
	const directory = createTempProjectDirectory()

	return {
		sessionID: "mock-session-id",
		directory: directory,
		ask: async (_request: unknown) => {},
	}
}

export function createMockToolExecutionContext(
	overrides: Partial<ToolContext> = {},
): ToolContext {
	const directory = overrides.directory ?? createTempProjectDirectory()
	const worktree = overrides.worktree ?? directory

	return {
		sessionID: "mock-session-id",
		messageID: "mock-message-id",
		agent: "ceo",
		directory,
		worktree,
		abort: new AbortController().signal,
		metadata() {},
		ask: async () => {},
		...overrides,
	}
}
