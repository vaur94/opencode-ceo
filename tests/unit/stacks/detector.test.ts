import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { detectStack } from "../../../src/stacks/detector.ts"

const testDirectories: string[] = []

function createProject(files: string[]): string {
  const directory = mkdtempSync(join(tmpdir(), "opencode-ceo-stack-"))
  testDirectories.push(directory)

  for (const file of files) {
    writeFileSync(join(directory, file), "")
  }

  return directory
}

afterEach(() => {
  while (testDirectories.length > 0) {
    const directory = testDirectories.pop()

    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("detectStack", () => {
  test("detects a TypeScript project and keeps the specialist agent id", () => {
    const directory = createProject(["package.json", "tsconfig.json", "bun.lockb"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "typescript",
      frameworks: [],
      buildTool: "bun run build",
      testTool: "bun test",
      packageManager: "bun",
      specialistAgent: "ceo-ts-specialist",
    })
  })

  test("detects a Python project and uses the Python specialist", () => {
    const directory = createProject(["pyproject.toml"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "python",
      frameworks: [],
      buildTool: "unknown",
      testTool: "pytest",
      packageManager: "unknown",
      specialistAgent: "ceo-python-specialist",
    })
  })

  test("detects a Go project and uses the Go specialist", () => {
    const directory = createProject(["go.mod"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "go",
      frameworks: [],
      buildTool: "go build",
      testTool: "go test ./...",
      packageManager: "unknown",
      specialistAgent: "ceo-go-specialist",
    })
  })

  test("returns the default fingerprint for an unknown project", () => {
    const directory = createProject([])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "unknown",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })
})
