export type { DelegationRequest, DelegationResult } from "@core/delegation-types"
import type { Plugin } from "@opencode-ai/plugin"
import { getDatabase } from "./state/database.js"
import { createAgentDefinitions } from "./agents/agent-factory.js"
import { registerTools } from "./tools/tool-registry.js"

const plugin: Plugin = async (input) => {
  const db = getDatabase(input.directory)
  void db

  const hooks = {
    tool: {},
  }

  registerTools(hooks, {
    directory: input.directory,
    worktree: input.worktree,
  })

  return {
    config: async (config) => {
      config.agent ??= {}
      Object.assign(config.agent, createAgentDefinitions())
    },
    event: async ({ event }) => {
      void event
    },
    tool: hooks.tool,
    "chat.message": async (input, output) => {
      void input
      void output
    },
    "chat.params": async (input, output) => {
      void input
      void output
    },
    "permission.ask": async (input, output) => {
      void input
      void output
    },
    "tool.execute.before": async (input, output) => {
      void input
      void output
    },
    "tool.execute.after": async (input, output) => {
      void input
      void output
    },
    "experimental.session.compacting": async (input, output) => {
      void input
      void output
    },
  }
}

export default plugin
