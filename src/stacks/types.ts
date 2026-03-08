export interface StackFingerprint {
  primaryLanguage: string
  frameworks: string[]
  buildTool: string
  testTool: string
  packageManager: string
  specialistAgent: string | null
}

export interface StackConfig {
  name: string
  markerFiles: string[]
  buildCommand?: string
  testCommand?: string
  lintCommand?: string
  specialistAgentId: string | null
}

export interface DetectionRule {
  language: string
  markerFiles: string[]
  priority: number
}
