import { existsSync } from "node:fs"
import { join } from "node:path"

import { DETECTION_CONFIGS } from "./detection-configs.js"
import type { StackFingerprint } from "./types.js"

function hasMarker(directory: string, markerFile: string): boolean {
  if (existsSync(join(directory, markerFile))) {
    return true
  }

  if (!markerFile.startsWith(".")) {
    return false
  }

  try {
    const entries = new Bun.Glob(`*${markerFile}`).scanSync({ cwd: directory })
    return entries[Symbol.iterator]().next().done === false
  } catch {
    return false
  }
}

export function detectStack(directory: string): StackFingerprint {
  for (const config of DETECTION_CONFIGS) {
    const foundMarker = config.markerFiles.some((markerFile) => hasMarker(directory, markerFile))

    if (foundMarker) {
      return {
        primaryLanguage: config.name,
        frameworks: [],
        buildTool: config.buildCommand ?? "unknown",
        testTool: config.testCommand ?? "unknown",
        packageManager: detectPackageManager(directory),
        specialistAgent: config.specialistAgentId,
      }
    }
  }

  return {
    primaryLanguage: "unknown",
    frameworks: [],
    buildTool: "unknown",
    testTool: "unknown",
    packageManager: "unknown",
    specialistAgent: null,
  }
}

function detectPackageManager(directory: string): string {
  if (existsSync(join(directory, "bun.lockb"))) return "bun"
  if (existsSync(join(directory, "yarn.lock"))) return "yarn"
  if (existsSync(join(directory, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(directory, "package-lock.json"))) return "npm"
  return "unknown"
}
