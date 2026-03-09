# opencode-ceo

[![CI](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml)
[![Release](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Transform OpenCode into a deterministic software company OS.

`opencode-ceo` is an OpenCode plugin that runs software work through a controlled delivery pipeline. The CEO agent decomposes work, delegates to specialists, enforces gates, persists artifacts/state, and can deliver changes into GitHub with branch and pull request automation.

## Language

- English: `README.md`
- Turkish: `README.tr.md`

## Why opencode-ceo?

- Deterministic pipeline ownership instead of ad-hoc agent output.
- SQLite-backed state and artifact persistence for long-running work.
- Delivery-aware GitHub tooling for branches, PRs, and repository fingerprinting.
- Gated autonomy levels for teams that want review points before delivery.

## Documentation Map

| Topic | English | Turkish |
|------|---------|---------|
| Documentation hub | `docs/README.md` | `docs/README.md` |
| Usage guide | `docs/en/usage-guide.md` | `docs/tr/kullanim-kilavuzu.md` |
| PR guide | `docs/en/pull-request-guide.md` | `docs/tr/pr-kilavuzu.md` |
| Model recommendations | `docs/en/model-recommendations.md` | `docs/tr/model-onerileri.md` |
| Architecture | `docs/ARCHITECTURE.md` | `docs/ARCHITECTURE.md` |
| Contributing | `CONTRIBUTING.md` | `CONTRIBUTING.md` |
| Security | `SECURITY.md` | `SECURITY.md` |
| Support | `SUPPORT.md` | `SUPPORT.md` |
| Changelog | `CHANGELOG.md` | `CHANGELOG.md` |

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

The smallest setup uses full autonomy:

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

Once configured, the `ceo` agent owns the task, delegates to hidden specialists, and advances the pipeline until work is blocked, failed, or completed.

## GitHub Delivery

`opencode-ceo` includes a GitHub-aware delivery path:

- `ceo_branch_prepare` creates `ceo/<pipeline-id>/<slug>` branches.
- `ceo_pr_prepare` pushes the active branch to `origin` and opens a PR with `gh pr create`.
- `ceo_repo_fingerprint` reports git state, remote information, and repository readiness.

Authenticate GitHub CLI before using the PR automation path:

```bash
gh auth login
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autonomyLevel` | `full` \| `gated` \| `manual` | `full` | Controls how much human intervention is required for pipeline transitions. |
| `gates` | `Record<string, "auto" \| "manual">` | `{}` | Configures specific approval gates such as `approve-plan` or `approve-delivery`. |
| `disabledAgents` | `string[]` | `[]` | Disables selected specialist agents. |
| `modelPreferences` | `Object` | `{}` | Overrides preferred models for stages such as implement, review, and test. |

For practical model suggestions, see `docs/en/model-recommendations.md`.

## Agents

The plugin provides one primary CEO agent and seven hidden specialists.

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

| Stage | Description | Primary Agent |
|-------|-------------|---------------|
| **Intake** | Initial task analysis and feasibility check. | `ceo` |
| **Decompose** | Breaking the task into a concrete implementation plan. | `ceo-architect` |
| **Implement** | Writing code and performing local verification. | `ceo-implementer` |
| **Review** | Peer review of changes for quality and standards. | `ceo-reviewer` |
| **Test** | Rigorous verification using test suites and CI-like checks. | `ceo-tester` |
| **Deliver** | Final packaging and submission. | `ceo` |

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

```bash
bun install
bun run ci:verify
```

Useful individual commands:

- `bun run build`
- `bun run typecheck`
- `bun test`
- `bun run pack:check`

## Repository Standards

- CI is enforced on `main` with separate quality, test, and package checks.
- Release publishing runs from tags through `.github/workflows/release.yml`.
- Dependabot is configured for npm and GitHub Actions updates.
- Branch protection requires reviews and passing checks before merge.

## Next Docs

- Getting started and operations: `docs/en/usage-guide.md`
- Pull request process: `docs/en/pull-request-guide.md`
- Model tuning by stage: `docs/en/model-recommendations.md`
- Architecture details: `docs/ARCHITECTURE.md`

## License

MIT
