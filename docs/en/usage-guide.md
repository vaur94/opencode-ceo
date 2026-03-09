# Usage Guide

## 1. Before You Start

Today, `opencode-ceo` is repository-ready but not publicly released on npm yet.

That means there are two different usage modes:

- repository development and evaluation from this codebase
- future npm installation after the first public release

## 2. Local Setup

```bash
bun install
bun run ci:verify
```

If you plan to use GitHub delivery locally:

```bash
gh auth login
```

## 3. Minimal Configuration

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

Use this when you want the CEO agent to move through the full pipeline automatically.

## 4. Controlled Configuration

```json
{
  "plugins": [
    {
      "name": "opencode-ceo",
      "config": {
        "autonomyLevel": "gated",
        "gates": {
          "approve-plan": "manual",
          "approve-review": "manual",
          "approve-delivery": "manual"
        },
        "modelPreferences": {
          "decompose": "high-reasoning-model",
          "implement": "coding-model",
          "review": "review-model",
          "test": "fast-validation-model"
        }
      }
    }
  ]
}
```

Use this when you want explicit human checkpoints before the plan, review, or delivery is accepted.

## 5. Runtime Flow

1. `ceo` receives the task.
2. The pipeline enters `intake` and advances through decomposition, implementation, review, test, and delivery.
3. Gates, artifacts, stage history, and decisions are stored in SQLite under `.ceo/` at runtime.
4. If the repository is GitHub-ready, delivery helpers can prepare a branch and open a pull request.

## 6. Day-To-Day Commands

```bash
bun run build
bun run typecheck
bun test
bun run pack:check
bun run ci:verify
```

## 7. Troubleshooting

### `bun install --frozen-lockfile` fails in CI

Run `bun install` locally and commit the updated `bun.lock` file.

### PR creation fails

Check all of the following:

- `gh auth status` succeeds
- the repository has an `origin` GitHub remote
- the current branch can be pushed upstream

### Delivery is blocked by gates

Use a less restrictive `autonomyLevel`, or change the relevant `gates` entry to `auto`.

### The package is not available from npm

That is expected until the first public release is published. Use the repository directly until then.

## 8. Related Docs

- [Pull Request Guide](./pull-request-guide.md)
- [Model Recommendations](./model-recommendations.md)
- [Release Guide](./release-guide.md)
- [Architecture](../ARCHITECTURE.md)
