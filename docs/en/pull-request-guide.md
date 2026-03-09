# Pull Request Guide

## Before You Open a PR

Run the full local gate:

```bash
bun run ci:verify
```

## Expected PR Shape

- one focused change set
- clear summary of what changed and why
- tests updated when behavior changed
- no unrelated dependency or formatting noise

## Required PR Content

Use `.github/PULL_REQUEST_TEMPLATE.md` and include:

- summary of the change
- impacted areas
- validation performed
- migration or compatibility notes when applicable

## Review Expectations

- at least one approval is required on `main`
- code owner review is required by branch protection
- required CI checks must pass before merge
- stale approvals are dismissed when the PR changes

## Merge Guidance

- keep history readable and scoped
- prefer small PRs over multi-topic batches
- do not bypass branch protection except for emergencies
