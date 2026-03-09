# opencode-ceo

[![CI](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/ci.yml)
[![Release](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml/badge.svg)](https://github.com/vaur94/opencode-ceo/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Build a disciplined, delivery-aware OpenCode workflow with a CEO agent, specialist delegation, persistent state, and GitHub handoff.

## 🚀 What This Project Does

`opencode-ceo` is an OpenCode plugin that turns software work into a controlled delivery pipeline. Instead of letting one agent improvise the whole task, it moves work through defined stages, persists decisions and artifacts, and can prepare Git branches and pull requests when the repository is ready.

## 🌍 Language Options

- [English README](./README.md)
- [Turkce README](./README.tr.md)

## ⚡ Status At A Glance

- CI on `main`: enabled and protected
- Release workflow: configured in `.github/workflows/release.yml`
- Dependabot: configured in `.github/dependabot.yml`
- npm package publication: not published yet
- GitHub release: not created yet

If you are evaluating release readiness, start with the [Release Guide](./docs/en/release-guide.md).

## ✨ Why opencode-ceo?

- Deterministic pipeline ownership instead of one-shot agent output
- SQLite-backed artifacts, gates, and state for long-running sessions
- GitHub-aware delivery helpers for branch and PR preparation
- Configurable autonomy for teams that want review gates before delivery

## 🧭 Documentation Hub

Start here if you want the full docs map:

- [Documentation Hub](./docs/README.md)

### Table of Contents

- [What This Project Does](#-what-this-project-does)
- [Status At A Glance](#-status-at-a-glance)
- [Documentation Hub](#-documentation-hub)
- [Installation Status](#-installation-status)
- [Configuration Example](#️-configuration-example)
- [Pipeline Overview](#️-pipeline-overview)
- [GitHub Delivery](#-github-delivery)
- [Local Verification](#-local-verification)
- [Repository Controls](#️-repository-controls)

Core guides:

- [Usage Guide](./docs/en/usage-guide.md)
- [Pull Request Guide](./docs/en/pull-request-guide.md)
- [Model Recommendations](./docs/en/model-recommendations.md)
- [Release Guide](./docs/en/release-guide.md)
- [Governance and Branch Policy](./docs/en/governance-guide.md)
- [Architecture](./docs/ARCHITECTURE.md)

Repository policies:

- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Support](./SUPPORT.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)

## 📦 Installation Status

The package name is `opencode-ceo`, but the first public npm release has not been published yet.

Current options:

- local development from this repository
- future npm install after the first release

Planned install command after publication:

```bash
npm install opencode-ceo
```

## ⚙️ Configuration Example

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

Minimal full-autonomy setup:

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

## 🏗️ Pipeline Overview

```text
[intake] -> [decompose] -> [implement] -> [review] -> [test] -> [deliver] -> [completed]
                 \-> [blocked]                                 \-> [failed]
```

Stage summary:

- `intake`: capture the task and detect the project stack
- `decompose`: build an implementation plan
- `implement`: produce the change set
- `review`: inspect correctness and risk
- `test`: validate behavior and regression safety
- `deliver`: prepare branch and PR output

For deeper detail, see [Architecture](./docs/ARCHITECTURE.md).

## 🧠 Model Preferences

You can tune `modelPreferences` by stage. Suggested defaults and trade-offs live here:

- [Model Recommendations](./docs/en/model-recommendations.md)

## 🔀 GitHub Delivery

`opencode-ceo` includes GitHub-aware delivery tools:

- `ceo_branch_prepare` creates `ceo/<pipeline-id>/<slug>` branches
- `ceo_pr_prepare` pushes the active branch to `origin` and opens a PR with `gh pr create`
- `ceo_repo_fingerprint` reports remote, git status, and general repo readiness

Before using PR automation locally:

```bash
gh auth login
```

## 🧪 Local Verification

```bash
bun install
bun run ci:verify
```

Useful individual commands:

- `bun run build`
- `bun run typecheck`
- `bun test`
- `bun run pack:check`

## 🛡️ Repository Controls

- protected `main` branch
- required `quality`, `tests`, and `package` checks
- linear history enforced
- force-push disabled on `main`
- conversations must be resolved before merge
- Dependabot active for npm and GitHub Actions
- CI currently listens to both `main` and `master` for compatibility, while `main` is the active branch policy target

Details: [Governance and Branch Policy](./docs/en/governance-guide.md)

## 📚 Next Steps

- operational setup: [Usage Guide](./docs/en/usage-guide.md)
- contribution flow: [Pull Request Guide](./docs/en/pull-request-guide.md)
- release flow: [Release Guide](./docs/en/release-guide.md)
- repo policy: [Governance and Branch Policy](./docs/en/governance-guide.md)

## 📄 License

MIT
