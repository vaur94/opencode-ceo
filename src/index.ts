import type { Plugin } from "@opencode-ai/plugin"
import { createAgentDefinitions } from "./agents/agent-factory.js"
import { createCompactionHandler } from "./context/compaction-handler.js"
import { packPipelineContext } from "./context/context-packer.js"
import { TOOL_PREFIX } from "./core/constants.js"
import { listArtifacts } from "./state/artifact-manager.js"
import { getDatabase } from "./state/database.js"
import { getPipelineBySession } from "./state/pipeline-store.js"
import { getStageHistory } from "./state/stage-store.js"
import { registerTools } from "./tools/tool-registry.js"

export type { DelegationRequest, DelegationResult } from "@core/delegation-types"

function appendSystemContext(system: string | undefined, context: string): string {
  return system ? `${system}\n\n${context}` : context
}

function getToolName(tool: unknown): string | undefined {
  if (typeof tool === "string") {
    return tool
  }

  if (tool && typeof tool === "object" && "name" in tool && typeof tool.name === "string") {
    return tool.name
  }

  return undefined
}

function getPermissionToolName(input: {
  pattern?: string | string[]
  metadata?: Record<string, unknown>
  title?: string
  tool?: unknown
}): string | undefined {
  const directToolName = getToolName(input.tool)

  if (directToolName) {
    return directToolName
  }

  const pattern = Array.isArray(input.pattern) ? input.pattern[0] : input.pattern

  if (typeof pattern === "string") {
    return pattern
  }

  const metadataTool = getToolName(input.metadata?.tool)

  if (metadataTool) {
    return metadataTool
  }

  if (typeof input.metadata?.toolName === "string") {
    return input.metadata.toolName
  }

  if (typeof input.metadata?.name === "string") {
    return input.metadata.name
  }

  return input.title
}

function getEventSessionID(event: {
  properties?: Record<string, unknown>
}): string | undefined {
  const properties = event.properties

  if (!properties) {
    return undefined
  }

  if (typeof properties.sessionID === "string") {
    return properties.sessionID
  }

  const info = properties.info

  if (info && typeof info === "object" && "id" in info && typeof info.id === "string") {
    return info.id
  }

  return undefined
}

const plugin: Plugin = async (input) => {
  const db = getDatabase(input.directory)
  const handleCompaction = createCompactionHandler(db)

  const hooks = {
    tool: {},
  }

  registerTools(hooks, {
    directory: input.directory,
    worktree: input.worktree,
  })

  return {
    config: async (config) => {
      try {
        config.agent ??= {}
        Object.assign(config.agent, createAgentDefinitions())
      } catch (error) {
        console.error("[CEO] config hook failed:", error)
      }
    },
    event: async ({ event }) => {
      try {
        const sessionID = getEventSessionID(event as { properties?: Record<string, unknown> })

        if (event.type === "session.created") {
          console.log("[CEO] session started:", sessionID ?? "unknown")
        }

        if (event.type === "session.deleted") {
          console.log("[CEO] session ended:", sessionID ?? "unknown")
        }
      } catch (error) {
        console.error("[CEO] event hook failed:", error)
      }
    },
    tool: hooks.tool,
    "chat.message": async (input, output) => {
      try {
        const pipeline = getPipelineBySession(db, input.sessionID)

        if (!pipeline) {
          return
        }

        const stages = getStageHistory(db, pipeline.id)
        const artifactCount = listArtifacts(db, pipeline.id).length
        const context = packPipelineContext(pipeline, stages, artifactCount)

        output.message.system = appendSystemContext(output.message.system, context)
      } catch (error) {
        console.error("[CEO] chat.message hook failed:", error)
      }
    },
    "chat.params": async (input, output) => {
      try {
        const pipeline = getPipelineBySession(db, input.sessionID)

        switch (pipeline?.state) {
          case "implement":
            output.temperature = 0.2
            break
          case "review":
          case "test":
            output.temperature = 0.1
            break
          default:
            output.temperature = 0.7
            break
        }
      } catch (error) {
        console.error("[CEO] chat.params hook failed:", error)
      }
    },
    "permission.ask": async (input, output) => {
      try {
        const toolName = getPermissionToolName(input as {
          pattern?: string | string[]
          metadata?: Record<string, unknown>
          title?: string
          tool?: unknown
        })

        if (toolName?.startsWith(TOOL_PREFIX)) {
          output.status = "allow"
          ;(output as { allow?: boolean }).allow = true
        }
      } catch (error) {
        console.error("[CEO] permission.ask hook failed:", error)
      }
    },
    "tool.execute.before": async (input, output) => {
      try {
        const toolName = getToolName(input.tool) ?? "unknown"
        const pipeline = getPipelineBySession(db, input.sessionID)

        console.log("[CEO] tool:", toolName, "pipeline_id:", pipeline?.id ?? "none")
      } catch (error) {
        console.error("[CEO] tool.execute.before hook failed:", error)
      }

      void output
    },
    "tool.execute.after": async (input, output) => {
      try {
        const toolName = getToolName(input.tool) ?? "unknown"
        const success = !(input as { error?: unknown }).error

        console.log("[CEO] tool result:", toolName, "success:", success)
      } catch (error) {
        console.error("[CEO] tool.execute.after hook failed:", error)
      }

      void output
    },
    "experimental.session.compacting": async (input, output) => {
      try {
        await handleCompaction(input, output)
      } catch (error) {
        console.error("[CEO] experimental.session.compacting hook failed:", error)
      }
    },
  }
}

export default plugin
