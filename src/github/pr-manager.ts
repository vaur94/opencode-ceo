import { $ } from "bun"
import { hasRemote, isGitHubRemote } from "./git-utils.js"

export async function createPR(
  directory: string,
  title: string,
  body: string,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (!(await hasRemote(directory))) {
    return { success: false, error: "No git remote configured" }
  }

  if (!(await isGitHubRemote(directory))) {
    return { success: false, error: "Remote is not GitHub" }
  }

  try {
    await $`gh auth status`.quiet()
  } catch {
    return { success: false, error: "GitHub CLI not authenticated. Run: gh auth login" }
  }

  try {
    const result = await $`gh pr create --title ${title} --body ${body}`.cwd(directory).text()
    const url = result
      .trim()
      .split("\n")
      .find((line) => line.startsWith("https://")) ?? result.trim()
    return { success: true, url }
  } catch (e) {
    return { success: false, error: `PR creation failed: ${String(e)}` }
  }
}

export async function getPRUrl(directory: string): Promise<string | null> {
  try {
    const result = await $`gh pr view --json url -q .url`.cwd(directory).text()
    return result.trim() || null
  } catch {
    return null
  }
}
