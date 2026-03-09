# Contributing to opencode-ceo

Thanks for contributing.

## Repository Reality

- CI and protected-branch automation are active.
- npm release automation is configured but the first public release has not happened yet.
- Documentation is maintained in both English and Turkish for user-facing topics.

## Local Setup

1. Install Bun.
2. Install dependencies:

```bash
bun install
```

3. Run the full verification suite:

```bash
bun run ci:verify
```

## Development Workflow

1. Create a focused branch.
2. Make the smallest change that fully resolves the issue.
3. Add or update tests when behavior changes.
4. Run `bun run ci:verify` before opening a pull request.
5. Use the pull request template to explain the change, validation, and any compatibility notes.

Detailed guidance lives in `docs/en/pull-request-guide.md` and `docs/tr/pr-kilavuzu.md`.

## Project Standards

- Match existing repository conventions and keep changes scoped.
- Do not commit secrets, generated tarballs, or local state.
- Prefer deterministic behavior and explicit verification over implicit assumptions.
- Update `README.md` or `docs/ARCHITECTURE.md` when user-facing or architectural behavior changes.
- Keep both `README.md` and `README.tr.md` aligned when user-facing behavior changes.

## Pull Requests

Every pull request should:

- explain why the change exists
- describe the affected files or subsystems
- list the validation that was run
- include follow-up risks or constraints when relevant

## Releases

The repository includes a GitHub release workflow for npm publishing.

- Tag releases with `v*` (for example `v0.2.0`), or run the release workflow manually.
- Configure the `NPM_TOKEN` GitHub Actions secret before using the workflow.
- Ensure `bun run ci:verify` passes before cutting a release.

## Further Reading

- [Documentation Hub](./docs/README.md)
- [Usage Guide](./docs/en/usage-guide.md)
- [Pull Request Guide](./docs/en/pull-request-guide.md)
- [Release Guide](./docs/en/release-guide.md)
