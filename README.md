# opencode-ceo

Transform OpenCode into a deterministic software company OS.

opencode-ceo is a specialized plugin for OpenCode that implements a structured software delivery pipeline. It uses a "CEO" agent to manage specialized subagents, ensuring that every task follows a rigorous process from architectural decomposition to final delivery. By enforcing state-driven transitions and gated approvals, it brings professional engineering standards to AI-driven development.

## Installation

```bash
npm install opencode-ceo
```

Add the plugin to your `opencode.json` configuration:

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "gated",
        "gates": {
          "approve-plan": "manual",
          "approve-review": "auto",
          "approve-delivery": "manual"
        }
      }
    }
  ]
}
```

## Quick Start

The simplest way to start is with the default configuration, which allows the CEO agent full autonomy:

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "full"
      }
    }
  ]
}
```

Once configured, the `ceo` agent will handle incoming tasks by delegating to specialists and advancing them through the delivery pipeline.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autonomyLevel` | `full` \| `gated` \| `manual` | `full` | Controls how much human intervention is required for pipeline transitions. |
| `gates` | `Record<string, "auto" \| "manual">` | `{}` | Configures specific approval gates (e.g., `approve-plan`, `approve-delivery`). |
| `disabledAgents` | `string[]` | `[]` | List of subagent IDs to disable. |
| `modelPreferences` | `Object` | `{}` | Preferred models for specific pipeline stages (implement, review, test). |

## Agents

The plugin provides a primary CEO agent and 7 specialized subagents.

| Agent ID | Purpose | Hidden |
|----------|---------|--------|
| `ceo` | Owns the delivery pipeline and delegates work. | No |
| `ceo-architect` | Breaks complex work into implementation-ready plans. | Yes |
| `ceo-implementer` | Implements scoped code changes and validates them locally. | Yes |
| `ceo-reviewer` | Reviews code changes for correctness and risk. | Yes |
| `ceo-tester` | Runs focused validation and safety checks. | Yes |
| `ceo-ts-specialist` | Handles TypeScript-heavy implementation and type issues. | Yes |
| `ceo-python-specialist` | Handles Python-specific implementation and runtime issues. | Yes |
| `ceo-go-specialist` | Handles Go-specific implementation and tooling issues. | Yes |

## Pipeline Stages

Tasks move through a finite state machine with the following primary stages:

| Stage | Description | Primary Agent |
|-------|-------------|---------------|
| **Intake** | Initial task analysis and feasibility check. | `ceo` |
| **Decompose** | Breaking the task into a concrete implementation plan. | `ceo-architect` |
| **Implement** | Writing code and performing local verification. | `ceo-implementer` |
| **Review** | Peer review of changes for quality and standards. | `ceo-reviewer` |
| **Test** | Rigorous verification using test suites and CI-like checks. | `ceo-tester` |
| **Deliver** | Final packaging and submission (e.g., Pull Request). | `ceo` |

## License

MIT
