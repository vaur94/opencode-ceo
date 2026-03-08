import { Database } from "bun:sqlite"
import { initializeDatabase } from "../../src/state/database.js"

export function createTestDatabase(): Database {
  const db = new Database(":memory:")
  initializeDatabase(db)
  return db
}

export function createMockPluginInput() {
  return {
    directory: "/tmp/test-project",
    worktree: "/tmp/test-project",
    client: {
      session: {
        create: async () => ({ data: { id: "mock-session-id" } }),
        promptAsync: async () => {},
        status: async () => ({ data: {} }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
      },
    },
  }
}

export function createMockToolContext() {
  return {
    sessionID: "mock-session-id",
    directory: "/tmp/test-project",
    ask: async () => ({ type: "approved" }),
  }
}
