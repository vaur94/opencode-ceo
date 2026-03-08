import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { getCurrentBranch, hasRemote, isGitHubRemote, isGitRepo } from "../../../src/github/git-utils.ts"

const testDirectories: string[] = []
const projectDirectory = "/home/ugur/Projects/opencode-ceo"

function createTempDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  testDirectories.push(directory)
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

describe("git-utils", () => {
  test("isGitRepo returns true for the current project", async () => {
    expect(await isGitRepo(projectDirectory)).toBeTrue()
  })

  test("isGitRepo returns false for a missing directory", async () => {
    const missingDirectory = join(createTempDirectory("opencode-ceo-missing-parent-"), "missing")

    expect(await isGitRepo(missingDirectory)).toBeFalse()
  })

  test("getCurrentBranch returns a non-empty branch name", async () => {
    expect(await getCurrentBranch(projectDirectory)).not.toHaveLength(0)
  })

  test("hasRemote resolves to a boolean without throwing", async () => {
    const result = await hasRemote(projectDirectory)

    expect(typeof result).toBe("boolean")
  })

  test("isGitHubRemote resolves to a boolean without throwing", async () => {
    const result = await isGitHubRemote(projectDirectory)

    expect(typeof result).toBe("boolean")
  })
})
