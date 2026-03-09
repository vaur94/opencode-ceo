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

- pull requests are required for `main`
- required CI checks must pass before merge
- conversations must be resolved before merge
- history must remain linear and force-pushes are blocked on `main`

## Merge Guidance

- keep history readable and scoped
- prefer small PRs over multi-topic batches
- do not bypass branch protection except for emergencies

## Related Docs

- [Governance and Branch Policy](./governance-guide.md)
- [Usage Guide](./usage-guide.md)
- [Contributing](../../CONTRIBUTING.md)
