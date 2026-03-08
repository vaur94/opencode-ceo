import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { $ } from "bun"
import { afterEach, describe, expect, test } from "bun:test"

import { branchExists, createBranch } from "../../../src/github/branch-manager.ts"

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

afterEach(() => {
  while (testDirectories.length > 0) {
    const directory = testDirectories.pop()

    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("branch-manager", () => {
  test("branchExists returns true for an existing branch", async () => {
    const directory = await createGitRepo("opencode-ceo-branch-exists-")

    await $`git checkout -b ceo/pipeline-1/existing`.cwd(directory).quiet()
    await $`git checkout -`.cwd(directory).quiet()

    expect(await branchExists(directory, "ceo/pipeline-1/existing")).toBeTrue()
  })

  test("createBranch returns a graceful error outside a git repo", async () => {
    const directory = createTempDirectory("opencode-ceo-not-git-")

    expect(await createBranch(directory, "pipeline-1", "feature")).toEqual({
      success: false,
      error: "Not a git repository",
    })
  })

  test("createBranch uses the ceo pipeline naming convention", async () => {
    const directory = await createGitRepo("opencode-ceo-branch-create-")

    expect(await createBranch(directory, "pipeline-42", "ship-it")).toEqual({
      success: true,
      branchName: "ceo/pipeline-42/ship-it",
    })
  })

  test("createBranch appends a numeric suffix when the branch already exists", async () => {
    const directory = await createGitRepo("opencode-ceo-branch-suffix-")

    await $`git checkout -b ceo/pipeline-99/release`.cwd(directory).quiet()
    await $`git checkout -`.cwd(directory).quiet()

    expect(await createBranch(directory, "pipeline-99", "release")).toEqual({
      success: true,
      branchName: "ceo/pipeline-99/release-1",
    })
  })
})
