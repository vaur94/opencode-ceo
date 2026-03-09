# Usage Guide

## Installation

```bash
npm install opencode-ceo
```

## Minimal Configuration

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

## Controlled Configuration

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

## Runtime Flow

1. The `ceo` agent receives the task.
2. The pipeline enters `intake` and moves through decomposition, implementation, review, test, and delivery.
3. Artifacts, gates, decisions, and stage history are stored in SQLite under `.ceo/` at runtime.
4. GitHub delivery tools can prepare a branch and open a PR when the repository is configured with a GitHub remote.

## Recommended Local Workflow

```bash
bun install
bun run ci:verify
gh auth login
```

## Troubleshooting

### `bun install --frozen-lockfile` fails in CI

Run `bun install` locally and commit the updated `bun.lock`.

### PR creation fails

Check all of the following:

- `gh auth status` succeeds
- the repository has an `origin` GitHub remote
- the current branch can be pushed upstream

### Delivery is blocked by gates

Use a less restrictive `autonomyLevel`, or configure the relevant `gates` entry to `auto`.

## Related Docs

- `pull-request-guide.md`
- `model-recommendations.md`
- `../ARCHITECTURE.md`
