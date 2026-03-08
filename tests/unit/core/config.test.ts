import { describe, expect, test } from "bun:test"
import { ZodError } from "zod"

import { CeoConfigSchema, loadConfig } from "../../../src/core/config.ts"

describe("config", () => {
  test("returns defaults when config is undefined", () => {
    expect(loadConfig(undefined)).toEqual({
      gates: {},
      autonomyLevel: "full",
      disabledAgents: [],
      modelPreferences: {},
    })
  })

  test("parses a valid plugin config", () => {
    const parsed = loadConfig({
      gates: {
        "approve-plan": "manual",
        "approve-review": "auto",
      },
      autonomyLevel: "gated",
      disabledAgents: ["reviewer", "tester"],
      modelPreferences: {
        implement: "gpt-5.4",
        review: "gpt-5.4-mini",
      },
    })

    expect(parsed).toEqual({
      gates: {
        "approve-plan": "manual",
        "approve-review": "auto",
      },
      autonomyLevel: "gated",
      disabledAgents: ["reviewer", "tester"],
      modelPreferences: {
        implement: "gpt-5.4",
        review: "gpt-5.4-mini",
      },
    })
  })

  test("exports a schema that applies defaults", () => {
    expect(CeoConfigSchema.parse({ disabledAgents: ["tester"] })).toEqual({
      gates: {},
      autonomyLevel: "full",
      disabledAgents: ["tester"],
      modelPreferences: {},
    })
  })

  test("throws a meaningful zod error for invalid config", () => {
    expect(() => loadConfig({ autonomyLevel: "supervised" })).toThrow(ZodError)

    try {
      loadConfig({ autonomyLevel: "supervised" })
      throw new Error("Expected invalid config to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError)
      expect((error as ZodError).message).toContain("autonomyLevel")
      expect((error as ZodError).message).toContain("full")
      expect((error as ZodError).message).toContain("gated")
      expect((error as ZodError).message).toContain("manual")
    }
  })
})
