import { $ } from "bun"
import { isGitRepo } from "./git-utils.js"

export async function branchExists(directory: string, branchName: string): Promise<boolean> {
  try {
    await $`git -C ${directory} rev-parse --verify ${branchName}`.quiet()
    return true
  } catch {
    return false
  }
}

export async function createBranch(
  directory: string,
  pipelineId: string,
  slug: string,
): Promise<{ success: true; branchName: string } | { success: false; error: string }> {
  if (!(await isGitRepo(directory))) {
    return { success: false, error: "Not a git repository" }
  }

  let branchName = `ceo/${pipelineId}/${slug}`

  if (await branchExists(directory, branchName)) {
    let n = 1

    while (await branchExists(directory, `${branchName}-${n}`)) {
      n++
    }

    branchName = `${branchName}-${n}`
  }

  try {
    await $`git -C ${directory} checkout -b ${branchName}`.quiet()
    return { success: true, branchName }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
