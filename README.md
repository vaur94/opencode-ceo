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

## GitHub Integration

`opencode-ceo` includes a delivery path for GitHub repositories:

- `ceo_branch_prepare` creates a pipeline branch using the `ceo/<pipeline-id>/<slug>` naming scheme.
- `ceo_pr_prepare` publishes the current branch to `origin` and opens a pull request with `gh pr create`.
- `ceo_repo_fingerprint` reports whether the repository is a Git repository, whether it has a GitHub remote, and the current git status.

To use the PR automation path locally, authenticate GitHub CLI first:

```bash
gh auth login
```

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

```text
[intake] -> [decompose] -> [implement] -> [review] -> [test] -> [deliver] -> [completed]
                 \-> [blocked]                                 \-> [failed]
```

Tasks move through a finite state machine with the following primary stages:

| Stage | Description | Primary Agent |
|-------|-------------|---------------|
| **Intake** | Initial task analysis and feasibility check. | `ceo` |
| **Decompose** | Breaking the task into a concrete implementation plan. | `ceo-architect` |
| **Implement** | Writing code and performing local verification. | `ceo-implementer` |
| **Review** | Peer review of changes for quality and standards. | `ceo-reviewer` |
| **Test** | Rigorous verification using test suites and CI-like checks. | `ceo-tester` |
| **Deliver** | Final packaging and submission (e.g., Pull Request). | `ceo` |

## Tool List

| Tool | Purpose |
|------|---------|
| `ceo_delegate` | Delegate work to a hidden subagent with explicit tool restrictions. |
| `ceo_stage_transition` | Move the pipeline through valid FSM states. |
| `ceo_gate_run` | Run an approval gate and optionally request manual approval. |
| `ceo_gate_status` | Inspect gate state for a pipeline. |
| `ceo_artifact_write` | Persist stage artifacts in SQLite-backed storage. |
| `ceo_artifact_read` | Read persisted artifacts. |
| `ceo_decision_log` | Record decisions in the audit trail. |
| `ceo_branch_prepare` | Create a delivery branch. |
| `ceo_pr_prepare` | Create a PR and persist its URL artifact. |
| `ceo_repo_fingerprint` | Return repository metadata, remote info, and git status. |
| `ceo_stack_detect` | Detect the active project stack. |
| `ceo_delivery_format` | Produce a markdown delivery summary. |
| `ceo_context_pack` | Pack SQLite-backed state for compaction. |
| `ceo_context_restore` | Restore packed state after compaction or resume. |

## Development

Install dependencies with Bun:

```bash
bun install
```

Run the standard verification flow before opening a pull request:

```bash
bun run ci:verify
```

Useful individual commands:

- `bun run build`
- `bun run typecheck`
- `bun test`
- `bun run pack:check`

Additional repository guidance lives in `CONTRIBUTING.md`, `SECURITY.md`, and `SUPPORT.md`.

## Repository Automation

- `.github/workflows/ci.yml` validates build, typecheck, tests, and package output on pushes and pull requests.
- `.github/workflows/release.yml` publishes tagged releases to npm when `NPM_TOKEN` is configured.
- `.github/dependabot.yml` keeps npm dependencies and GitHub Actions up to date.
- `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md` provide consistent intake for bugs, features, and pull requests.

## License

MIT
