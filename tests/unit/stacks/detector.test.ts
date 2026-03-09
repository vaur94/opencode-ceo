import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { detectStack } from "../../../src/stacks/detector.ts"

const testDirectories: string[] = []

function createProject(files: string[]): string {
  const directory = mkdtempSync(join(tmpdir(), "opencode-ceo-stack-"))
  testDirectories.push(directory)

  for (const file of files) {
    writeFileSync(join(directory, file), "")
  }

  return directory
}

afterEach(() => {
  while (testDirectories.length > 0) {
    const directory = testDirectories.pop()

    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("detectStack", () => {
  test("detects a TypeScript project and keeps the specialist agent id", () => {
    const directory = createProject(["package.json", "tsconfig.json", "bun.lockb"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "typescript",
      frameworks: [],
      buildTool: "bun run build",
      testTool: "bun test",
      packageManager: "bun",
      specialistAgent: "ceo-ts-specialist",
    })
  })

  test("detects a Python project and uses the Python specialist", () => {
    const directory = createProject(["pyproject.toml"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "python",
      frameworks: [],
      buildTool: "unknown",
      testTool: "pytest",
      packageManager: "unknown",
      specialistAgent: "ceo-python-specialist",
    })
  })

  test("detects a Go project and uses the Go specialist", () => {
    const directory = createProject(["go.mod"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "go",
      frameworks: [],
      buildTool: "go build",
      testTool: "go test ./...",
      packageManager: "unknown",
      specialistAgent: "ceo-go-specialist",
    })
  })

  test("detects a Rust project from Cargo.toml", () => {
    const directory = createProject(["Cargo.toml"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "rust",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Java project from pom.xml", () => {
    const directory = createProject(["pom.xml"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "java",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a C# project from a .csproj file", () => {
    const directory = createProject(["example.csproj"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "csharp",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a C# project from .csproj", () => {
    const directory = createProject([".csproj"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "csharp",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Ruby project from Gemfile", () => {
    const directory = createProject(["Gemfile"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "ruby",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a PHP project from composer.json", () => {
    const directory = createProject(["composer.json"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "php",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Swift project from Package.swift", () => {
    const directory = createProject(["Package.swift"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "swift",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Kotlin project from build.gradle.kts", () => {
    const directory = createProject(["build.gradle.kts"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "kotlin",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Scala project from build.sbt", () => {
    const directory = createProject(["build.sbt"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "scala",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects an Elixir project from mix.exs", () => {
    const directory = createProject(["mix.exs"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "elixir",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a C/C++ project from CMakeLists.txt", () => {
    const directory = createProject(["CMakeLists.txt"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "c_cpp",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("detects a Dart project from pubspec.yaml", () => {
    const directory = createProject(["pubspec.yaml"])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "dart",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })

  test("returns the default fingerprint for an unknown project", () => {
    const directory = createProject([])

    expect(detectStack(directory)).toEqual({
      primaryLanguage: "unknown",
      frameworks: [],
      buildTool: "unknown",
      testTool: "unknown",
      packageManager: "unknown",
      specialistAgent: null,
    })
  })
})
