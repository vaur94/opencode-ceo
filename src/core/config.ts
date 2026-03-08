import { z } from "zod"

const GateModeSchema = z.enum(["auto", "manual"])
const AutonomyLevelSchema = z.enum(["full", "gated", "manual"])

export const CeoConfigSchema = z.object({
  gates: z.record(z.string(), GateModeSchema).default({}),
  autonomyLevel: AutonomyLevelSchema.default("full"),
  disabledAgents: z.array(z.string()).default([]),
  modelPreferences: z
    .object({
      implement: z.string().optional(),
      review: z.string().optional(),
      test: z.string().optional(),
    })
    .default({}),
})

export type CeoConfig = z.infer<typeof CeoConfigSchema>

export function loadConfig(pluginConfig: unknown): CeoConfig {
  return CeoConfigSchema.parse(pluginConfig ?? {})
}
