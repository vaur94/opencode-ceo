import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { $ } from "bun"
import { afterEach, describe, expect, test } from "bun:test"

import { createPR, getPRUrl } from "../../../src/github/pr-manager.ts"

const testDirectories: string[] = []

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

async function createGitRepoWithRemote(prefix: string, remoteUrl: string): Promise<string> {
  const directory = await createGitRepo(prefix)

  await $`git remote add origin ${remoteUrl}`.cwd(directory).quiet()

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

describe("pr-manager", () => {
  test("createPR returns a graceful error when no remote is configured", async () => {
    const directory = await createGitRepo("opencode-ceo-no-remote-")

    expect(await createPR(directory, "Title", "Body")).toEqual({
      success: false,
      error: "No git remote configured",
    })
  })

  test("createPR returns a graceful error for non-GitHub remotes", async () => {
    const directory = await createGitRepoWithRemote("opencode-ceo-non-github-", "git@example.com:repo.git")

    expect(await createPR(directory, "Title", "Body")).toEqual({
      success: false,
      error: "Remote is not GitHub",
    })
  })

  test("getPRUrl returns null when gh cannot resolve a PR", async () => {
    const directory = await createGitRepo("opencode-ceo-pr-view-null-")

    expect(await getPRUrl(directory)).toBeNull()
  })
})
