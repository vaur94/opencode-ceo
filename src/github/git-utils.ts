import { $ } from "bun"

export async function isGitRepo(directory: string): Promise<boolean> {
  try {
    await $`git -C ${directory} rev-parse --git-dir`.quiet()
    return true
  } catch {
    return false
  }
}

export async function getCurrentBranch(directory: string): Promise<string> {
  const result = await $`git -C ${directory} branch --show-current`.text()
  return result.trim()
}

export async function pushCurrentBranch(directory: string, branchName?: string): Promise<void> {
  const currentBranch = (branchName ?? (await getCurrentBranch(directory))).trim()

  if (currentBranch.length === 0) {
    throw new Error("No current branch checked out")
  }

  await $`git -C ${directory} push -u origin ${currentBranch}`.quiet()
}

export async function hasRemote(directory: string): Promise<boolean> {
  try {
    const result = await $`git -C ${directory} remote`.text()
    return result.trim().length > 0
  } catch {
    return false
  }
}

export async function isGitHubRemote(directory: string): Promise<boolean> {
  try {
    const result = await $`git -C ${directory} remote get-url origin`.text()
    return result.includes("github.com")
  } catch {
    return false
  }
}
