import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { $ } from "bun"

import {
  getCurrentBranch,
  hasRemote,
  isGitHubRemote,
  isGitRepo,
  pushCurrentBranch,
} from "../../../src/github/git-utils.ts"

const testDirectories: string[] = []
const projectDirectory = "/home/ugur/Projects/opencode-ceo"

function createTempDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix))
  testDirectories.push(directory)
  return directory
}

async function createGitRepo(prefix: string): Promise<string> {
  const directory = createTempDirectory(prefix)

  await $`git init`.cwd(directory).quiet()
  await $`git config user.name Test User`.cwd(directory).quiet()
  await $`git config user.email test@example.com`.cwd(directory).quiet()
  await $`git commit --allow-empty -m initial`.cwd(directory).quiet()

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

  test("pushCurrentBranch publishes the current branch to origin", async () => {
    const directory = await createGitRepo("opencode-ceo-push-branch-")
    const remoteDirectory = createTempDirectory("opencode-ceo-remote-")

    await $`git init --bare`.cwd(remoteDirectory).quiet()
    await $`git remote add origin ${remoteDirectory}`.cwd(directory).quiet()

    await pushCurrentBranch(directory)

    const branchName = await getCurrentBranch(directory)
    const remoteBranches = await $`git --git-dir ${remoteDirectory} show-ref --heads`.text()

    expect(remoteBranches).toContain(`refs/heads/${branchName}`)
  })
})
