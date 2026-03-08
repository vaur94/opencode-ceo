import type { PluginInput } from "@opencode-ai/plugin"

import {
  DELEGATION_TIMEOUT_MS,
  MAX_CONCURRENT_SESSIONS,
  TOOL_PREFIX,
} from "@core/constants"
import { AGENT_IDS, getToolRestrictions, isValidDelegationTarget } from "../agents/agent-registry.js"

type SessionClient = PluginInput["client"]["session"]

export interface ToolContext {
  client: PluginInput["client"]
  directory: string
  sessionID: string
}

export interface CeoDelegateParams {
  agent: string
  prompt: string
  timeout?: number
}

type SessionStatusMap = Record<string, { type?: string }>
type SessionMessagePart = { type: string; text?: string }
type SessionMessage = { role: string; parts: SessionMessagePart[] }

let activeDelegations = 0
const delegationWaiters: Array<() => void> = []

async function acquireDelegationSlot(): Promise<void> {
  if (activeDelegations < MAX_CONCURRENT_SESSIONS) {
    activeDelegations += 1
    return
  }

  await new Promise<void>((resolve) => {
    delegationWaiters.push(() => {
      activeDelegations += 1
      resolve()
    })
  })
}

function releaseDelegationSlot(): void {
  activeDelegations = Math.max(0, activeDelegations - 1)

  const nextWaiter = delegationWaiters.shift()
  nextWaiter?.()
}

function getValidDelegationTargets(): string {
  return AGENT_IDS.filter((agentId) => isValidDelegationTarget("ceo", agentId)).join(", ")
}

function buildToolRestrictions(agent: string): Record<string, boolean> {
  return {
    ...getToolRestrictions(agent),
    [`${TOOL_PREFIX}delegate`]: false,
  }
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function getSessionStatus(
  sessionClient: SessionClient,
  sessionID: string,
  directory: string,
): Promise<string | undefined> {
  const result = await sessionClient.status({
    query: {
      directory,
    },
  })

  const statuses = (result.data ?? {}) as SessionStatusMap
  return statuses[sessionID]?.type
}

async function waitForSessionCompletion(
  sessionClient: SessionClient,
  sessionID: string,
  directory: string,
  timeout: number,
): Promise<boolean> {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    await Bun.sleep(250)

    try {
      if ((await getSessionStatus(sessionClient, sessionID, directory)) === "idle") {
        return true
      }
    } catch {}
  }

  try {
    return (await getSessionStatus(sessionClient, sessionID, directory)) === "idle"
  } catch {
    return false
  }
}

async function abortSession(sessionClient: SessionClient, sessionID: string, directory: string): Promise<void> {
  await sessionClient.abort({
    path: { id: sessionID },
    query: {
      directory,
    },
  })
}

async function getAssistantOutput(
  sessionClient: SessionClient,
  sessionID: string,
  directory: string,
): Promise<string> {
  const result = await sessionClient.messages({
    path: { id: sessionID },
    query: {
      directory,
    },
  })

  const messages = (result.data ?? []) as SessionMessage[]

  const output = messages
    .filter((message) => message.role === "assistant")
    .flatMap((message) => message.parts)
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim()

  return output || "Delegation completed (no output)"
}

export async function executeCeoDelegate(
  params: CeoDelegateParams,
  context: ToolContext,
): Promise<string> {
  const { agent, prompt, timeout = DELEGATION_TIMEOUT_MS } = params

  if (!isValidDelegationTarget("ceo", agent)) {
    return `Error: Invalid delegation target "${agent}". Valid targets: ${getValidDelegationTargets()}`
  }

  await acquireDelegationSlot()

  try {
    let sessionID = ""

    try {
      const createResult = await context.client.session.create({
        body: {
          parentID: context.sessionID,
          title: `Delegation to ${agent}`,
        },
        query: {
          directory: context.directory,
        },
      })

      sessionID = createResult.data.id
    } catch (error) {
      const message = extractErrorMessage(error)

      if (message.includes("Unauthorized")) {
        return "Error: Delegation failed - OAuth token restricted. Check authentication."
      }

      return `Error: Sub-session creation failed: ${message}`
    }

    try {
      await context.client.session.promptAsync({
        path: { id: sessionID },
        body: {
          agent,
          tools: buildToolRestrictions(agent),
          parts: [{ type: "text", text: prompt }],
        },
        query: {
          directory: context.directory,
        },
      })
    } catch (error) {
      return `Error: Failed to send prompt to subagent: ${extractErrorMessage(error)}`
    }

    if (!(await waitForSessionCompletion(context.client.session, sessionID, context.directory, timeout))) {
      try {
        await abortSession(context.client.session, sessionID, context.directory)
      } catch {}

      return `Error: Delegation to ${agent} timed out after ${timeout}ms`
    }

    try {
      return await getAssistantOutput(context.client.session, sessionID, context.directory)
    } catch (error) {
      return `Error: Failed to retrieve subagent output: ${extractErrorMessage(error)}`
    }
  } finally {
    releaseDelegationSlot()
  }
}
