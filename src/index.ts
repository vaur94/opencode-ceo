import type { Plugin } from "@opencode-ai/plugin"
import { type ToolDefinition, tool as pluginTool } from "@opencode-ai/plugin/tool"
import { createAgentDefinitions } from "./agents/agent-factory.js"
import { createCompactionHandler } from "./context/compaction-handler.js"
import { packPipelineContext } from "./context/context-packer.js"
import { loadConfig, type CeoConfig } from "./core/config.js"
import { TOOL_PREFIX } from "./core/constants.js"
import { createLogger } from "./core/logger.js"
import {
  runDecomposeStage,
  runDeliverStage,
  runImplementStage,
  runIntakeStage,
  runReviewStage,
  runTestStage,
  type PipelineStageContext,
} from "./pipelines/feature-pipeline.js"
import { listArtifacts } from "./state/artifact-manager.js"
import { getDatabase } from "./state/database.js"
import { getPipelineBySession } from "./state/pipeline-store.js"
import { getStageHistory } from "./state/stage-store.js"
import { executeCeoDelegate } from "./tools/ceo-delegate.js"
import { registerTools } from "./tools/tool-registry.js"

export type { DelegationRequest, DelegationResult } from "@core/delegation-types"

function appendSystemContext(system: string | undefined, context: string): string {
  return system ? `${system}\n\n${context}` : context
}

function extractGoal(parts: Array<{ type?: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n")
}

async function runPipeline(ctx: PipelineStageContext): Promise<void> {
  for (;;) {
    const pipeline = getPipelineBySession(ctx.db, ctx.sessionID)
    const state = pipeline?.state ?? "intake"

    if (state === "blocked" || state === "completed" || state === "failed") {
      return
    }

    const result =
      state === "intake"
        ? await runIntakeStage(ctx)
        : state === "decompose"
          ? await runDecomposeStage(ctx)
          : state === "implement"
            ? await runImplementStage(ctx)
            : state === "review"
              ? await runReviewStage(ctx)
              : state === "test"
                ? await runTestStage(ctx)
                : await runDeliverStage(ctx)

    if (!result.success) {
      return
    }
  }
}

function extractPluginConfig(config: unknown): CeoConfig {
  const plugins =
    config && typeof config === "object" && "plugins" in config
      ? (config as { plugins?: Array<{ name?: string; config?: unknown }> }).plugins
      : undefined

  const pluginConfig = plugins?.find((entry) => entry.name === "opencode-ceo")?.config
  return loadConfig(pluginConfig ?? {})
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

const plugin: Plugin = async (pluginInput) => {
  const db = getDatabase(pluginInput.directory)
  const logger = createLogger("unknown")
  const handleCompaction = createCompactionHandler(db)
  let activeConfig = loadConfig({})

  const hooks: { tool: Record<string, ToolDefinition> } = {
    tool: {},
  }

  registerTools(hooks, {
    directory: pluginInput.directory,
    worktree: pluginInput.worktree,
    client: pluginInput.client,
  })

  return {
    config: async (config) => {
      try {
        activeConfig = extractPluginConfig(config)
        config.agent ??= {}
        Object.assign(config.agent, createAgentDefinitions(activeConfig))
      } catch (error) {
        console.error("[CEO] config hook failed:", error)
      }
    },
    event: async ({ event }) => {
      try {
        const sessionID = getEventSessionID(event as { properties?: Record<string, unknown> })

        if (event.type === "session.created") {
          logger.logInfo("session.started", { sessionID: sessionID ?? "unknown" })
        }

        if (event.type === "session.deleted") {
          logger.logInfo("session.ended", { sessionID: sessionID ?? "unknown" })
        }
      } catch (error) {
        console.error("[CEO] event hook failed:", error)
      }
    },
    tool: hooks.tool,
    "chat.message": async (input, output) => {
      try {
        if (input.agent === "ceo") {
          await runPipeline({
            pipelineId: getPipelineBySession(db, input.sessionID)?.id ?? crypto.randomUUID(),
            directory: pluginInput.directory,
            sessionID: input.sessionID,
            db,
            goal: extractGoal(output.parts as Array<{ type?: string; text?: string }>),
            config: activeConfig,
            delegate: (agent, prompt) =>
              executeCeoDelegate(
                { agent, prompt },
                { client: pluginInput.client, directory: pluginInput.directory, sessionID: input.sessionID },
              ),
          })
        }

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
        const toolDefinition = hooks.tool[toolName]

        if (toolDefinition) {
          output.args = pluginTool.schema.object(toolDefinition.args).parse(output.args)
        }

        logger.logInfo("tool.before", { tool: toolName, pipeline_id: pipeline?.id ?? "none" })
      } catch (error) {
        console.error("[CEO] tool.execute.before hook failed:", error)
      }

      void output
    },
    "tool.execute.after": async (input, output) => {
      try {
        const toolName = getToolName(input.tool) ?? "unknown"
        const success = !output.output.startsWith("Error:")

        if (toolName === `${TOOL_PREFIX}stage_transition`) {
          const args = input.args as { pipeline_id?: string }
          const pipeline = args.pipeline_id ? getPipelineBySession(db, input.sessionID) : null
          logger.logInfo("pipeline.state", {
            pipeline_id: pipeline?.id ?? args.pipeline_id ?? "none",
            state: pipeline?.state ?? "unknown",
          })
        }

        logger.logInfo("tool.after", { tool: toolName, success })
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
