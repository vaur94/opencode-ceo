import { describe, it, expect } from "bun:test"
import plugin from "../src/index.js"

describe("plugin", () => {
  it("exports a default function", () => {
    expect(typeof plugin).toBe("function")
  })

  it("returns a hooks object when called", async () => {
    const mockInput = {
      directory: "/tmp/test-smoke",
      worktree: "/tmp/test-smoke",
      client: {} as any,
    }
    const hooks = await plugin(mockInput as any)
    expect(typeof hooks).toBe("object")
  })
})
