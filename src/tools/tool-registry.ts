import type { Hooks } from "@opencode-ai/plugin"

import { TOOL_PREFIX } from "@core/constants"
import { createToolDefinitions, type ToolFactoryDeps } from "./tool-factory.js"

export function registerTools(hooks: Hooks, deps: ToolFactoryDeps): void {
  const toolDefinitions = createToolDefinitions(deps)

  hooks.tool ??= {}

  for (const [toolName, toolDefinition] of Object.entries(toolDefinitions)) {
    if (!toolName.startsWith(TOOL_PREFIX)) {
      throw new Error(`Tool registration requires '${TOOL_PREFIX}' prefix: ${toolName}`)
    }

    hooks.tool[toolName] = toolDefinition
  }
}
