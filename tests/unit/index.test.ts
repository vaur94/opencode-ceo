import { describe, expect, test } from "bun:test"

import plugin from "../../src/index.ts"
import { getPipelineBySession } from "../../src/state/pipeline-store.ts"
import { createMockPluginInput } from "../helpers/test-utils.ts"

describe("plugin runtime orchestration", () => {
	test("config hook applies disabledAgents from plugin config", async () => {
		const input = createMockPluginInput()
		const hooks = await plugin({
			...input,
			serverUrl: new URL("https://example.com"),
			project: {} as never,
			$: {} as never,
		})
		const config = {
			agent: {},
			plugins: [
				{
					name: "opencode-ceo",
					config: {
						disabledAgents: ["ceo-go-specialist"],
					},
				},
			],
		} as unknown as Parameters<NonNullable<typeof hooks.config>>[0]

		await hooks.config?.(config)

		if (!config.agent) {
			throw new Error("Expected config hook to populate agent definitions")
		}

		expect(config.agent["ceo-go-specialist"]).toBeUndefined()
		expect(config.agent.ceo).toBeDefined()
	})

	test("chat.message creates and advances a pipeline for the ceo agent", async () => {
		const input = createMockPluginInput()
		const hooks = await plugin({
			...input,
			serverUrl: new URL("https://example.com"),
			project: {} as never,
			$: {} as never,
		})

		const output = {
			message: {
				id: "message-1",
				sessionID: "mock-session-id",
				role: "user",
				time: { created: Date.now() },
				agent: "ceo",
				model: { providerID: "test", modelID: "test" },
				system: undefined,
			},
			parts: [
				{
					id: "part-1",
					sessionID: "mock-session-id",
					messageID: "message-1",
					type: "text",
					text: "Build the feature pipeline end to end",
				},
			],
		} as unknown as Parameters<NonNullable<typeof hooks["chat.message"]>>[1]

		await hooks["chat.message"]?.(
			{
				sessionID: "mock-session-id",
				agent: "ceo",
			},
			output,
		)

		const pipeline = getPipelineBySession((await import("../../src/state/database.ts")).getDatabase(input.directory), "mock-session-id")

		expect(pipeline).not.toBeNull()
		expect(pipeline?.goal).toBe("Build the feature pipeline end to end")
		expect(typeof output.message.system).toBe("string")
		expect(output.message.system).toContain("[CEO State]")
	})
})
