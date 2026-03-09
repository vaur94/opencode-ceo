import type { Config } from "@opencode-ai/sdk"
import type { CeoConfig } from "../core/config.js"
import { createCeoAgentDefinition } from "./ceo-agent.js"
import { type AgentId, AGENT_IDS, getAgentContract, getToolRestrictions } from "./agent-registry.js"
import { getSystemPrompt } from "./system-prompts.js"

type AgentMap = NonNullable<Config["agent"]>

export type AgentDefinition = Exclude<AgentMap[string], undefined> & {
  hidden: boolean
}

const AGENT_NAMES: Record<AgentId, string> = {
  ceo: "CEO",
  "ceo-architect": "CEO Architect",
  "ceo-implementer": "CEO Implementer",
  "ceo-reviewer": "CEO Reviewer",
  "ceo-tester": "CEO Tester",
  "ceo-ts-specialist": "CEO TypeScript Specialist",
  "ceo-python-specialist": "CEO Python Specialist",
  "ceo-go-specialist": "CEO Go Specialist",
}

function createAgentDefinition(agentId: AgentId): AgentDefinition {
  if (agentId === "ceo") {
    return createCeoAgentDefinition()
  }

  const contract = getAgentContract(agentId)

  return {
    name: AGENT_NAMES[agentId],
    description: contract.purpose,
    prompt: getSystemPrompt(agentId),
    tools: getToolRestrictions(agentId),
    mode: contract.mode,
    hidden: contract.hidden,
  }
}

export function createAgentDefinitions(config?: CeoConfig): Record<string, AgentDefinition> {
  return Object.fromEntries(
    AGENT_IDS.filter((agentId) => !config?.disabledAgents.includes(agentId)).map((agentId) => [agentId, createAgentDefinition(agentId)]),
  )
}
