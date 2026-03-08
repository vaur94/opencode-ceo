import type { PluginInput } from "@opencode-ai/plugin"

import type { DelegationRequest, DelegationResult } from "../../src/core/delegation-types"

type DelegationClient = PluginInput["client"]

interface DelegationPoCContext {
  sessionID: string
  directory: string
  title: string
}

export async function runDelegationProofOfConcept(
  client: DelegationClient,
  context: DelegationPoCContext,
  request: DelegationRequest,
): Promise<DelegationResult> {
  let sessionID = ""
  const startedAt = Date.now()

  try {
    // 1. session.create() creates a child session linked back to the parent.
    const createResult = await client.session.create({
      body: {
        parentID: context.sessionID,
        title: `${context.title} (@${request.targetAgent} subagent)`,
      },
      query: {
        directory: context.directory,
      },
    })

    if (!createResult.data) {
      throw new Error("Session creation failure: session.create() returned no data.")
    }

    sessionID = createResult.data.id
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Unauthorized: OAuth tokens can block session.create(); surface auth guidance.
    if (message.includes("Unauthorized")) {
      return {
        success: false,
        output: "",
        sessionID,
        error: "Unauthorized: the current OAuth token cannot create delegated sessions.",
      }
    }

    // Session creation failure: any other create() error stops the lifecycle early.
    return {
      success: false,
      output: "",
      sessionID,
      error: `Session creation failure: ${message}`,
    }
  }

  try {
    // 2. session.promptAsync() dispatches the delegated prompt with per-call tool restrictions.
    await client.session.promptAsync({
      path: { id: sessionID },
      body: {
        agent: request.targetAgent,
        tools: request.tools,
        parts: [{ type: "text", text: request.prompt }],
      },
      query: {
        directory: context.directory,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // Prompt failure: promptAsync() accepted neither the agent, tools, nor payload.
    return {
      success: false,
      output: "",
      sessionID,
      error: `Prompt failure: ${message}`,
    }
  }

  // 3. session.status() is polled until the delegated session reports type === "idle".
  while (Date.now() - startedAt < request.timeout) {
    const statusResult = await client.session.status({
      query: {
        directory: context.directory,
      },
    })
    if (!statusResult.data) {
      throw new Error("Prompt failure: session.status() returned no data.")
    }

    const status = statusResult.data[sessionID]

    if (status?.type === "idle") {
      // 4. session.messages() retrieves the assistant output after completion.
      const messagesResult = await client.session.messages({
        path: { id: sessionID },
        query: {
          directory: context.directory,
        },
      })

      if (!messagesResult.data) {
        throw new Error("Prompt failure: session.messages() returned no data.")
      }

      const output = messagesResult.data
        .flatMap((message) => message.parts)
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim()

      return {
        success: true,
        output,
        sessionID,
      }
    }

    await Bun.sleep(250)
  }

  // Timeout: abort the delegated session and return an explicit timeout error.
  await client.session.abort({
    path: { id: sessionID },
    query: {
      directory: context.directory,
    },
  })

  return {
    success: false,
    output: "",
    sessionID,
    error: `Timeout: delegation exceeded ${request.timeout}ms and was aborted.`,
  }
}
