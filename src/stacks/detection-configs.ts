import type { StackConfig } from "./types.js"

export const DETECTION_CONFIGS: StackConfig[] = [
  {
    name: "typescript",
    markerFiles: ["package.json", "tsconfig.json"],
    buildCommand: "bun run build",
    testCommand: "bun test",
    lintCommand: "bun run lint",
    specialistAgentId: "ceo-ts-specialist",
  },
  {
    name: "python",
    markerFiles: ["pyproject.toml", "setup.py", "requirements.txt"],
    testCommand: "pytest",
    lintCommand: "mypy",
    specialistAgentId: "ceo-python-specialist",
  },
  {
    name: "go",
    markerFiles: ["go.mod"],
    buildCommand: "go build",
    testCommand: "go test ./...",
    lintCommand: "golint",
    specialistAgentId: "ceo-go-specialist",
  },
  {
    name: "rust",
    markerFiles: ["Cargo.toml"],
    specialistAgentId: null,
  },
  {
    name: "csharp",
    markerFiles: [".csproj", ".sln"],
    specialistAgentId: null,
  },
  {
    name: "ruby",
    markerFiles: ["Gemfile"],
    specialistAgentId: null,
  },
  {
    name: "php",
    markerFiles: ["composer.json"],
    specialistAgentId: null,
  },
  {
    name: "swift",
    markerFiles: ["Package.swift"],
    specialistAgentId: null,
  },
  {
    name: "kotlin",
    markerFiles: ["build.gradle.kts"],
    specialistAgentId: null,
  },
  {
    name: "java",
    markerFiles: ["pom.xml", "build.gradle"],
    specialistAgentId: null,
  },
  {
    name: "scala",
    markerFiles: ["build.sbt"],
    specialistAgentId: null,
  },
  {
    name: "elixir",
    markerFiles: ["mix.exs"],
    specialistAgentId: null,
  },
  {
    name: "c_cpp",
    markerFiles: ["CMakeLists.txt", "Makefile"],
    specialistAgentId: null,
  },
  {
    name: "dart",
    markerFiles: ["pubspec.yaml"],
    specialistAgentId: null,
  },
]
